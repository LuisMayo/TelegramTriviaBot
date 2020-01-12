import * as Telegraf from 'telegraf';

export class ButtonKeyBoardHelper {
    buttons: Telegraf.CallbackButton[][] = [];
    lastArr = [];
    buttonsInCurrentLine = 0;

    constructor() {
        this.buttons.push(this.lastArr);
    }
    addNewButton(text: string, data: string) {
        if (this.buttonsInCurrentLine >= 2 || (this.buttonsInCurrentLine === 1 && text.length >= 15)) {
            this.newLine();
        }
        this.lastArr.push(Telegraf.Markup.callbackButton(text, data));
        this.buttonsInCurrentLine++;
        if (text.length >= 15) {
            this.newLine();
        }
    }

    private newLine() {
        this.lastArr = [];
        this.buttons.push(this.lastArr);
        this.buttonsInCurrentLine = 0;
    }
}
