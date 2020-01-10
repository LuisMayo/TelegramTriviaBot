import { Conf } from "./conf";
import * as fs from 'fs';
import * as Telegraf from 'telegraf';
import { GameInfo } from "./game-info";
import { Status } from "./status";
import { Question, Answer } from "./question";

const version = '1.0.0';
const confPath = process.argv[2] || './conf';
const conf: Conf = JSON.parse(fs.readFileSync(confPath + '/conf.json', { encoding: 'UTF-8' }));
const bot = new Telegraf.default(conf.token);
const stateMap = new Map<number, GameInfo>();

bot.start(ctx => {
    ctx.reply(conf.messages.start, {parse_mode: "Markdown"});
    ctx.from
});

bot.command('version', ctx => {
    ctx.reply(version);
});

bot.command(['create', 'init'], ctx => {
    if (!stateMap.has(ctx.chat.id)) {
        stateMap.set(ctx.chat.id, new GameInfo(ctx.from, conf.default));
        ctx.reply('Do you want to use standard settings?', {reply_markup: makeYesNoKeyboard()});
    } else {
        ctx.reply('You already have an started game, may you /cancel it?')
    }
});

bot.command('/cancel', ctx => {
    if(stateMap.has(ctx.chat.id) && stateMap.get(ctx.chat.id).isPlayerAdmin(ctx.from.id)) {
        ctx.reply('Game ended prematurely\n' + stateMap.get(ctx.chat.id).printStats())
        stateMap.delete(ctx.chat.id);
    }
});

bot.action('yes', ctx => {
    if (stateMap.has(ctx.chat.id) && stateMap.get(ctx.chat.id).state === Status.INIT) {
        const state = stateMap.get(ctx.chat.id);
        state.state = Status.PLAYING;
    }
});

function serveNextQuestionOrEndGame(state: GameInfo) {
    if (state.state === Status.PLAYING) {
        if (state.currentQuestion === state.currentQuestion + 1) {
            bot.telegram.sendMessage(state.chatID, 'Game end!\n' + state.printStats(), {parse_mode: "Markdown"});
        } else {
            state.currentQuestion++;
            const question = state.questionArray[state.currentQuestion];
            bot.telegram.sendMessage(state.chatID,'Question!\nCategory:' + question.category);
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
    for(const answer of ansers) {
        buttons.push(Telegraf.Markup.callbackButton(answer.answerText,
            'q' + questionNumber.toString() + ':' + i.toString()));
        i++;
    }
    const keyboard = Telegraf.Markup.inlineKeyboard(buttons);
    return keyboard;
}

