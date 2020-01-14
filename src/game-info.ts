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
    pendingStart = false;
    constructor(user: User, conf: GameConfig, chatID: number) {
        this.players.push(new Player(user, true));
        this.state = Status.INIT;
        this.gameConfig = conf;
        this.currentQuestion = -1;
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

    loadQuestions(question: Question[]) {
        this.questionArray = question;
        this.questionsLeft = question.length;
    }

    printAllPlayers() {
        let string = '';
        for (const player of this.players) {
            string += player.getPlayerLink() + '\n';
        }
        return string;
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

    printSettings() {
        return `Question number:${this.gameConfig.totalQuestions}\n` +
        `Question difficulty: ${this.gameConfig.difficulty || 'All'}\n` +
        `Question type: ${this.gameConfig.typeOfQuestions || 'All'}\n` +
        `Time to play before timeout: ${this.gameConfig.timeout}s\n`+
        `Timeouts before kick: ${this.gameConfig.ausence_tolerance}`
    }

    printStats() {
        return `Done Questions: ${this.questionsDone} of a total of ${this.gameConfig.totalQuestions}
        ${this.printPlayerStats()}`
    }

    resolveQuestion(timeout: boolean) {
        let string = timeout ? "Time's up!\n" : 'All players have now answered\n';
        string += `The correct answer was ${this.getCurrentQuestion().getCorrectAnswer().answerText}\n`;
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

    removePlayerFromID(id: number) {
        this.players.splice(this.players.findIndex(player => player.id === id), 1);
    }

    setQuestions(questions: Question[]) {
        this.questionArray = questions;
        this.questionsLeft = questions.length;
    }
}
