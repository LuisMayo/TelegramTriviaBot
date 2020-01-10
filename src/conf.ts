export type GameConfig = {
    totalQuestions: number;
    typeOfQuestions: QuestionsType;
    difficulty: Difficulty;
};

export type Conf = {
    token: string;
    adminChat: string;
    extendedLog: boolean;
    messages: {
        start: string;
    },
    default: GameConfig
};

export enum QuestionsType {
    ALL = '',
    SIMPLE = 'boolean',
    MULTIPLE = 'multiple',
    FREE = 'free'
}

export enum Difficulty {
    EASY = 'easy',
    MEDIUM = 'medium',
    HARD = 'hard'
}