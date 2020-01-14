import { QuestionsType, Difficulty } from "../conf";
import { Provider } from "./providers";
import { URLSearchParams } from "url";
import { Question, Answer } from "../question";
import { knuthShuffle } from "knuth-shuffle";
import fetch from 'cross-fetch';

export interface OpenTDBResponse {
    response_code: number;
    results: Result[];
}

export interface Result {
    category: string;
    type: QuestionsType;
    difficulty: Difficulty;
    question: string;
    correct_answer: string;
    incorrect_answers: string[];
}

export class OpenTriviaHandler implements Provider {
    async getQuestions(gameInfo: import("../conf").GameConfig) {
        const params = new URLSearchParams();
        params.set('amount', gameInfo.totalQuestions.toString());
        params.set('encode', 'base64');
        if (gameInfo.difficulty != null && gameInfo.difficulty.length > 0) {
            if(gameInfo.difficulty.length === 1) {
                params.set('difficulty', gameInfo.difficulty[0]);
            }
        }
        if (gameInfo.typeOfQuestions != null) {
            params.set('type', gameInfo.typeOfQuestions);
        }
        const response = await fetch(`https://opentdb.com/api.php?${params.toString()}`);
        const json: OpenTDBResponse = await response.json();
        return this.loadQuestions(json)
    }

    private loadQuestions(response: OpenTDBResponse) {
        return response.results.map((result, i) => {
            const question = new Question();
            question.category = Buffer.from(result.category, 'base64').toString();
            question.text = Buffer.from(result.question, 'base64').toString();
            question.answers = result.incorrect_answers.map(answer => {
                return new Answer(Buffer.from(answer, 'base64').toString(), false);
            });
            question.answers.push(new Answer(Buffer.from(result.correct_answer, 'base64').toString(), true));
            question.type = result.type;
            if (question.type === QuestionsType.MULTIPLE) {
                question.answers = knuthShuffle(question.answers);
            }
            question.number = i;
            return question;
        });
    }
}