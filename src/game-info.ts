import { Status } from "./status";
import { GameUser, Player } from "./player";
import { User } from "telegram-typings";

export class GameInfo {
    chatID: string;
    state: Status
    players: Player[] = [];
    totalQuestions: number;
    questionsDone: number;
    questionsLeft: number;
    currentQuestion: number;
    constructor(user: User) {
        this.players.push(new Player(user, true));
        this.state = Status.INIT;
    }

    isPlayerAdmin(id: number) {
        const savedPlayer = this.players.find(player => player.id === id);
        return savedPlayer && savedPlayer.gameAdmin;
    }

    printPlayerStats() {
        this.players.sort((a,b) => {
            return a.stats.getCorrectScore() > b.stats.getCorrectScore() ? -1 : 1;
        });
        let string = '';
        for (const player of this.players) {
            string += player.getStats() + '\n';
        }
        return string;
    }

    printStats() {
        return `Done Questions: ${this.questionsDone} of a total of ${this.totalQuestions}
${this.printPlayerStats()}`
    }
}
