import { QuestionsType } from "./conf";
import { OpenTDBResponse } from "./providers/openTrivia";
import { ProviderList } from "./providers/providers";

export class Question {
    answers: Answer[];
    type: QuestionsType;
    category: string;
    text: string;
    number: number;

    getCorrectAnswer() {
        return this.answers.find(answer => answer.isCorrect);
    }

    isAnswerCorrect(id: number) {
        return id != null && this.answers[id].isCorrect;
    }
}

export class Answer {
    answerText: string;
    isCorrect: boolean;

    constructor(text: string, isCorrect: boolean) {
        this.answerText = text;
        this.isCorrect = isCorrect;
    }
}