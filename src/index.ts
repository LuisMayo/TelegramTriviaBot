import { Conf } from "./conf";
import * as fs from 'fs';
import * as Telegraf from 'telegraf';
import { GameInfo } from "./game-info";
import { Status } from "./status";
import { Question, Answer } from "./question";
import { Player } from "./player";
import { ProviderFactory } from "./provider-factory";
import { ProviderList } from "./providers/providers";
import { User } from "telegraf/typings/telegram-types";
import { PlayerStats } from "./stats";

const version = '1.0.1';
const confPath = process.argv[2] || './conf';
const conf: Conf = JSON.parse(fs.readFileSync(confPath + '/conf.json', { encoding: 'UTF-8' }));
const bot = new Telegraf.default(conf.token);
const stateMap = new Map<number, GameInfo>();

bot.start(ctx => {
    ctx.reply(conf.messages.start, { parse_mode: "Markdown" });
    ctx.from
});

bot.command('admin', ctx => {
    const text = ctx.message.text.split('admin').pop();
    if (!text || text.trim() === '') {
        ctx.reply('You must specify the message. For example: `/admin I love you`', { parse_mode: 'Markdown' })
    } else {
        bot.telegram.sendMessage(conf.adminChat, `User ${makeUserLink(ctx.from)} has sent you the following message:
${text.trim()}`, { parse_mode: "Markdown" });
        ctx.reply('Message to the admin has been sent');
    }
});

bot.command('version', ctx => {
    ctx.reply(version);
});

bot.command(['create', 'init'], ctx => {
    if (!stateMap.has(ctx.chat.id)) {
        stateMap.set(ctx.chat.id, new GameInfo(ctx.from, conf.default, ctx.chat.id));
        ctx.reply('Do you like current settings?\n' + stateMap.get(ctx.chat.id).printSettings() , { reply_markup: makeYesNoKeyboard() });
    } else {
        ctx.reply('You already have an started game, may you /cancel it?')
    }
});

bot.command('join', ctx => {
    if (stateMap.has(ctx.chat.id)) {
        const state = stateMap.get(ctx.chat.id);
        if (state.findPlayerByID(ctx.from.id)) {
            ctx.reply('Player is already in game');
        } else {
            const player = new Player(ctx.from);
            state.players.push(player);
            ctx.reply('Player ' + player.getPlayerLink() + ' has joined the game\nPlayer List:\n' + state.printAllPlayers(), { parse_mode: "Markdown" });
            if (state.state === Status.PLAYING) {
                player.stats.unanswered = state.currentQuestion;
            }
        }
    } else {
        ctx.reply('There is no game in progress. You may want to use /create to make one');
    }
});

bot.command(['/cancel', '/stop'], ctx => {
    if (stateMap.has(ctx.chat.id) && stateMap.get(ctx.chat.id).isPlayerAdmin(ctx.from.id)) {
        endGamePrematurely(stateMap.get(ctx.chat.id));
    }
});

bot.command('launch', ctx => {
    if (stateMap.has(ctx.chat.id)) {
        const state = stateMap.get(ctx.chat.id);
        if (state.state === Status.PAUSED) {
            state.state = Status.PLAYING;
            serveNextQuestionOrEndGame(state);
        } else if (state.state === Status.PENDING) {
            state.pendingStart = true;
        }
    }
});

bot.command('leave', ctx => {
    if (stateMap.has(ctx.chat.id)) {
        kickPlayer(ctx.from.id, stateMap.get(ctx.chat.id));
    }
});

bot.action('yes', ctx => {
    if (stateMap.has(ctx.chat.id) && stateMap.get(ctx.chat.id).state === Status.INIT) {
        const state = stateMap.get(ctx.chat.id);
        state.state = Status.PENDING;
        ctx.reply('Alrighty then, use the /launch command when everybody is aboard (Tip: Players may join using /join at every moment, including during gameplay)');
        // TODO lmayo consultar API aquí
        const provider = ProviderFactory.getProvider(ProviderList.TRIVIADB);
        provider.getQuestions(state.gameConfig).then(
            data => {
                state.setQuestions(data);
                if (state.pendingStart) {
                    serveNextQuestionOrEndGame(state);
                }
                state.state = Status.PAUSED;
            }
        )
        ctx.answerCbQuery();
    }
});

bot.action('no', ctx => {
    if (stateMap.has(ctx.chat.id) && stateMap.get(ctx.chat.id).state === Status.INIT) {
        ctx.reply("I'm so sorry, my dumb creator didn't gave me the ability to customize game yet 😓")
        ctx.answerCbQuery();
    }
});

bot.action(/q\d+:\d+/, ctx => {
    if (stateMap.has(ctx.chat.id) && stateMap.get(ctx.chat.id).state === Status.PLAYING) {
        const cbQuery = ctx.callbackQuery.data;
        const state = stateMap.get(ctx.chat.id);
        if (+cbQuery.substring(1, cbQuery.indexOf(':')) === state.currentQuestion) {
            const player = state.findPlayerByID(ctx.from.id);
            if (player) {
                player.lastAnswer = +cbQuery.substring(cbQuery.indexOf(':') + 1);
                if (state.haveAllPlayersAnswered()) {
                    clearTimeout(state.lastTimeOutID);
                    endQuestion(state, false);
                }
                ctx.answerCbQuery('Response registered');
            } else {
                ctx.reply(`I'm terribly sorry ${ctx.from.first_name}](tg://user?id=${ctx.from.id}) but you're not on this game. You may join with /join`,
                    { parse_mode: "Markdown", reply_to_message_id: ctx.message.message_id });
                ctx.answerCbQuery();
            }
        } else {
            ctx.answerCbQuery('That question has already finished');
        }
    } else {
        ctx.answerCbQuery();
    }
});

process.on('SIGINT', function () {
    saveState();
    process.exit(0);
});

loadState();

bot.launch();

function endGamePrematurely(state: GameInfo) {
    bot.telegram.sendMessage(state.chatID, 'Game ended prematurely\n' + state.printStats(), { parse_mode: "Markdown" });
    clearTimeout(state.lastTimeOutID);
    stateMap.delete(state.chatID);
}

function endQuestion(state: GameInfo, timeOut: boolean) {
    let resume = true;
    const message = state.resolveQuestion(timeOut);
    bot.telegram.sendMessage(state.chatID, message, { parse_mode: "Markdown" }).then(() => {
        for (const player of state.players) {
            if (player.consecutiveAusences >= state.gameConfig.ausence_tolerance) {
                resume = kickPlayer(player.id, state);
            }
        }
        if (resume) {
            serveNextQuestionOrEndGame(state);
        }
    });
}

/**
 * 
 * @param playerID 
 * @param state 
 * @returns true if game must continue
 */
function kickPlayer(playerID: number, state: GameInfo): boolean {
    const player = state.findPlayerByID(playerID);
    bot.telegram.sendMessage(state.chatID, `Player ${player.getPlayerLink()} kicked due to inactivity`,
        { parse_mode: "Markdown" });
    state.removePlayerFromID(playerID);
    if (state.players.length === 0) {
        endGamePrematurely(state)
        return false;
    }
    return true;
}

function makeAnswerKeyboard(ansers: Answer[], questionNumber: number) {
    const buttons: Telegraf.CallbackButton[][] = [];
    let i = 0;
    let buttonsInCurrentLine = 0;
    let lastArr = [];
    buttons.push(lastArr);
    for (const answer of ansers) {
        if (buttonsInCurrentLine >= 2 || (buttonsInCurrentLine === 1 && answer.answerText.length >= 15)) {
            lastArr = [];
            buttons.push(lastArr);
            buttonsInCurrentLine = 0;
        }
        lastArr.push(Telegraf.Markup.callbackButton(answer.answerText,
            'q' + questionNumber.toString() + ':' + i.toString()));
        i++;
        buttonsInCurrentLine++;
        if (answer.answerText.length >= 15) {
            lastArr = [];
            buttons.push(lastArr);
            buttonsInCurrentLine = 0;
        }
    }
    const keyboard = Telegraf.Markup.inlineKeyboard(buttons);
    return keyboard;
}

function makeUserLink(usr: User) {
    return `[${usr.first_name}](tg://user?id=${usr.id})`
}

function makeYesNoKeyboard() {
    const keyboard = Telegraf.Markup.inlineKeyboard([
        Telegraf.Markup.callbackButton("Yes", "yes"),
        Telegraf.Markup.callbackButton("No, let me customize", "no")
    ]);
    return keyboard;
}

function saveState() {
    const stateArray = Array.from(stateMap.values());
    for (const state of stateArray) {
        delete state.lastTimeOutID;
    }
    const save = JSON.stringify(stateArray);
    fs.writeFileSync(confPath + '/state.json', save, { encoding: 'UTF-8' });
}

function loadState() {
    try {
        const loadArray = fs.readFileSync(confPath + '/state.json', { encoding: 'UTF-8' });
        const array: GameInfo[] = JSON.parse(loadArray)
        for (const state of array) {
            const realState = Object.assign(new GameInfo(null, null, null), state);
            for (let i=0; i < realState.players.length; i++) {
                const fakePlayer = realState.players[i];
                const realPlayer = Object.assign(new Player(null), fakePlayer);
                realPlayer.stats = Object.assign(new PlayerStats(), fakePlayer.stats);
                realState.players[i] = realPlayer;
            }
            for (let i=0; i < realState.questionArray.length; i++) {
                const fakeQuestion = realState.questionArray[i];
                const realQuestion = Object.assign(new Question(), fakeQuestion);
                realState.questionArray[i] = realQuestion;
            }
            realState.lastTimeOutID = setTimeout(endQuestion,realState.gameConfig.timeout * 1000,realState, true);
            stateMap.set(state.chatID, realState);
        }
    } catch (e) {
    }
}

function serveNextQuestionOrEndGame(state: GameInfo) {
    if (state.state === Status.PLAYING) {
        if (state.currentQuestion + 1 === state.questionArray.length) {
            bot.telegram.sendMessage(state.chatID, 'Game end!\n' + state.printStats(), { parse_mode: "Markdown" });
            stateMap.delete(state.chatID);
        } else {
            state.currentQuestion++;
            const question = state.questionArray[state.currentQuestion];
            bot.telegram.sendMessage(state.chatID, 'Question⁉Category:' + question.category + '\n' + question.text, { reply_markup: makeAnswerKeyboard(question.answers, state.currentQuestion) });
            state.lastTimeOutID = setTimeout(endQuestion, state.gameConfig.timeout * 1000, state, true);
        }
    }
}



