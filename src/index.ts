import { Conf } from "./conf";
import * as fs from 'fs';
import * as Telegraf from 'telegraf';
import { GameInfo } from "./game-info";
import { Status } from "./status";

const version = '1.0.0';
const confPath = process.argv[2] || './conf';
const conf: Conf = JSON.parse(fs.readFileSync(confPath + '/conf.json', { encoding: 'UTF-8' }));
const bot = new Telegraf.default(conf.token);
const stateMap = new Map<number, GameInfo>();

bot.start(ctx => {
    ctx.reply(conf.messages.start, {parse_mode: "Markdown"});
    ctx.from
});

bot.command(['create', 'init'], ctx => {
    if (!stateMap.has(ctx.chat.id)) {
        stateMap.set(ctx.chat.id, new GameInfo(ctx.from));
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
        state.totalQuestions = 10;
    }
});


function makeYesNoKeyboard() {
    const keyboard = Telegraf.Markup.inlineKeyboard([
        Telegraf.Markup.callbackButton("Yes, default settings", "yes"),
        Telegraf.Markup.callbackButton("No, let me customize", "no")
    ]);
    return keyboard;
}

