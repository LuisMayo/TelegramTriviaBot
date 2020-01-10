import { QuestionsType } from "./conf";
import { OpenTDBResponse } from "./providers/openTrivia";
import { ProviderList } from "./providers/providers";

export class Question {
    answers: Answer[];
    type: QuestionsType;
    category: string;
    text: string;
    number: number;

    isAnswerCorrect(id: number) {
        return this.answers[id].isCorrect;
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