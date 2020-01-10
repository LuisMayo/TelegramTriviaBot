import { Status } from "./status";
import { Player } from "./player";
import { User } from "telegram-typings";
import { GameConfig, QuestionsType } from "./conf";
import { Question, Answer } from "./question";
import { OpenTDBResponse } from "./providers/openTrivia";
import { ProviderList } from "./providers/providers";
import { knuthShuffle } from "knuth-shuffle";

export class GameInfo {
    chatID: number;
    state: Status
    players: Player[] = [];
    gameConfig: GameConfig;
    questionsDone: number;
    questionsLeft: number;
    currentQuestion: number;
    questionArray: Question[];
    lastTimeOutID: NodeJS.Timeout;
    constructor(user: User, conf: GameConfig, chatID: number) {
        this.players.push(new Player(user, true));
        this.state = Status.INIT;
        this.gameConfig = conf;
        this.currentQuestion = 0;
        this.questionsDone = 0;
        this.chatID = chatID;
    }




    findPlayerByID(id: number) {
        return this.players.find(player => player.id === id);
    }

    getCurrentQuestion() {
        return this.questionArray[this.currentQuestion];
    }

    haveAllPlayersAnswered() {
        return this.players.find(player => player.lastAnswer == null) == null;
    }

    isPlayerAdmin(id: number) {
        const savedPlayer = this.findPlayerByID(id);
        return savedPlayer && savedPlayer.gameAdmin;
    }

    printPlayerStats() {
        this.players.sort((a, b) => {
            return a.stats.guessed > b.stats.guessed ? -1 : 1;
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

    resolveQuestion(timeout: boolean) {
        let string = timeout ? "Time's up!\n" : 'All players have now answered\n';
        string += `The correct answer was ${this.getCurrentQuestion().getCorrectAnswer()}\n`;
        for(const player of this.players) {
            string += `User ${player.getPlayerLink()}`;
            if (this.getCurrentQuestion().isAnswerCorrect(player.lastAnswer)) {
                string += ' guessed';
                player.stats.guessed++;
            } else if (player.lastAnswer != null) {
                string += ' failed'
                player.stats.failed++;
            } else {
                string += " didn't answer";
            }

            if (player.lastAnswer != null) {
                player.consecutiveAusences = 0;
            } else {
                player.consecutiveAusences++;
            }
            player.lastAnswer = null;
            string += `. Score ${player.stats.getStats()}\n`
        }
        return string;
    }

    setQuestions(questions: Question[]) {
        this.questionArray = questions;
        this.questionsLeft = questions.length;
    }
}
