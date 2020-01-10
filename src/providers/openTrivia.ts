import { QuestionsType, Difficulty } from "../conf";
import { Provider } from "./providers";
import { URLSearchParams } from "url";
import { Question, Answer } from "../question";
import { knuthShuffle } from "knuth-shuffle";

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
        params.set('encode', 'url3986');
        if (gameInfo.difficulty != null) {
            params.set('difficulty', gameInfo.difficulty);
        }
        if (gameInfo.difficulty != null) {
            params.set('difficulty', gameInfo.difficulty);
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
            question.category = decodeURI(result.category);
            question.text = decodeURI(result.question);
            question.answers = result.incorrect_answers.map(answer => {
                return new Answer(decodeURI(answer), false);
            });
            question.answers.push(new Answer(decodeURI(result.correct_answer), true));
            question.type = result.type;
            if (question.type === QuestionsType.MULTIPLE) {
                question.answers = knuthShuffle(question.answers);
            }
            question.number = i;
            return question;
        });
    }
}