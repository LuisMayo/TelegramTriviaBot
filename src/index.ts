import { Conf } from "./conf";
import * as fs from 'fs';
import * as Telegraf from 'telegraf';
import { GameInfo } from "./game-info";
import { Status } from "./status";
import { Question, Answer } from "./question";
import { Player } from "./player";
import { ProviderFactory } from "./provider-factory";
import { ProviderList } from "./providers/providers";

const version = '1.0.0';
const confPath = process.argv[2] || './conf';
const conf: Conf = JSON.parse(fs.readFileSync(confPath + '/conf.json', { encoding: 'UTF-8' }));
const bot = new Telegraf.default(conf.token);
const stateMap = new Map<number, GameInfo>();

bot.start(ctx => {
    ctx.reply(conf.messages.start, { parse_mode: "Markdown" });
    ctx.from
});

bot.command('version', ctx => {
    ctx.reply(version);
});

bot.command(['create', 'init'], ctx => {
    if (!stateMap.has(ctx.chat.id)) {
        stateMap.set(ctx.chat.id, new GameInfo(ctx.from, conf.default, ctx.chat.id));
        ctx.reply('Do you want to use standard settings?', { reply_markup: makeYesNoKeyboard() });
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
            ctx.reply('Player ' + player.getPlayerLink() + 'has joined the game\nPlayer List:\n' + state.printAllPlayers(), { parse_mode: "Markdown" });
        }
    } else {
        ctx.reply('There is no game in progress. You may want to use /create to make one');
    }
});

bot.command(['/cancel', '/stop'], ctx => {
    if (stateMap.has(ctx.chat.id) && stateMap.get(ctx.chat.id).isPlayerAdmin(ctx.from.id)) {
        ctx.reply('Game ended prematurely\n' + stateMap.get(ctx.chat.id).printStats())
        stateMap.delete(ctx.chat.id);
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
        const state = stateMap.get(ctx.chat.id);
        const cbQuery = ctx.callbackQuery.data;
        const player = state.findPlayerByID(ctx.from.id);
        if (player) {
            player.lastAnswer = +cbQuery.substring(cbQuery.indexOf(':') + 1);
            if (state.haveAllPlayersAnswered()) {
                clearTimeout(state.lastTimeOutID);
                endQuestion(state, false);
                ctx.answerCbQuery('Response registered');
            }
        } else {
            ctx.reply(`I'm terribly sorry ${ctx.from.first_name}](tg://user?id=${ctx.from.id}) but you're not on this game. You may join with /join`,
                { parse_mode: "Markdown", reply_to_message_id: ctx.message.message_id });
            ctx.answerCbQuery();
        }
    } else {
        ctx.answerCbQuery();
    }
});

function endQuestion(state: GameInfo, timeOut: boolean) {
    const message = state.resolveQuestion(timeOut);
    bot.telegram.sendMessage(state.chatID, message, {parse_mode: "Markdown"});
    serveNextQuestionOrEndGame(state);
}


function serveNextQuestionOrEndGame(state: GameInfo) {
    if (state.state === Status.PLAYING) {
        if (state.currentQuestion === state.currentQuestion + 1) {
            bot.telegram.sendMessage(state.chatID, 'Game end!\n' + state.printStats(), { parse_mode: "Markdown" });
            stateMap.delete(state.chatID);
        } else {
            state.currentQuestion++;
            const question = state.questionArray[state.currentQuestion];
            bot.telegram.sendMessage(state.chatID, 'Question!\nCategory:' + question.category + '\n' + question.text, { reply_markup: makeAnswerKeyboard(question.answers, state.currentQuestion) });
            state.lastTimeOutID = setTimeout(endQuestion, state.gameConfig.timeout * 1000, state, true);
        }
    }
}


function makeYesNoKeyboard() {
    const keyboard = Telegraf.Markup.inlineKeyboard([
        Telegraf.Markup.callbackButton("Yes, default settings", "yes"),
        Telegraf.Markup.callbackButton("No, let me customize", "no")
    ]);
    return keyboard;
}

function makeAnswerKeyboard(ansers: Answer[], questionNumber: number) {
    const buttons: Telegraf.CallbackButton[] = [];
    let i = 0;
    for (const answer of ansers) {
        buttons.push(Telegraf.Markup.callbackButton(answer.answerText,
            'q' + questionNumber.toString() + ':' + i.toString()));
        i++;
    }
    const keyboard = Telegraf.Markup.inlineKeyboard(buttons);
    return keyboard;
}

