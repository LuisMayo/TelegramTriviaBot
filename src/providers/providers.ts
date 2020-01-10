import { GameConfig } from "../conf";
import { Question } from "../question";

export interface Provider {
    getQuestions(gameInfo: GameConfig): Promise<Question[]>;
}

export enum ProviderList {
    TRIVIADB
}