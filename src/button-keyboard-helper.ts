import * as Telegraf from 'telegraf';
import { CallbackButton } from 'telegraf/typings/markup';

export class ButtonKeyBoardHelper {
    buttons: CallbackButton[][] = [];
    lastArr = [];
    charactersInCurrentLine = 0;

    constructor() {
        this.buttons.push(this.lastArr);
    }
    addNewButton(text: string, data: string) {
        if (this.charactersInCurrentLine + text.length >= 30) {
            this.newLine();
        }
        this.lastArr.push(Telegraf.Markup.callbackButton(text, data));
        this.charactersInCurrentLine+=text.length;
    }

    private newLine() {
        this.lastArr = [];
        this.buttons.push(this.lastArr);
        this.charactersInCurrentLine = 0;
    }
}
