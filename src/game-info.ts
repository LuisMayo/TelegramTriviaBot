import { Status } from "./status";
import { Player } from "./player";
import { User } from "telegram-typings";
import { GameConfig, QuestionsType } from "./conf";
import { Question, Answer } from "./question";
import { OpenTDBResponse } from "./providers/openTrivia";
import { ProviderList } from "./providers/providers";
import { knuthShuffle } from "knuth-shuffle";

export class GameInfo {
    chatID: string;
    state: Status
    players: Player[] = [];
    gameConfig: GameConfig;
    questionsDone: number;
    questionsLeft: number;
    currentQuestion: number;
    questionArray: Question[];
    constructor(user: User, conf: GameConfig) {
        this.players.push(new Player(user, true));
        this.state = Status.INIT;
        this.gameConfig = conf;
    }

    isPlayerAdmin(id: number) {
        const savedPlayer = this.findPlayerByID(id);
        return savedPlayer && savedPlayer.gameAdmin;
    }

    findPlayerByID(id: number) {
        return this.players.find(player => player.id === id);
    }

    printPlayerStats() {
        this.players.sort((a, b) => {
            return a.stats.getCorrectScore() > b.stats.getCorrectScore() ? -1 : 1;
        });
        let string = '';
        for (const player of this.players) {
            string += player.getStats() + '\n';
        }
        return string;
    }

    printAllPlayers() {
        let string = '';
        for (const player of this.players) {
            string += player.getPlayerLink() + '\n';
        }
        return string;
    }

    printStats() {
        return `Done Questions: ${this.questionsDone} of a total of ${this.gameConfig.totalQuestions}
${this.printPlayerStats()}`
    }
}
