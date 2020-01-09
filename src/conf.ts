export type Conf = {
    token: string;
    adminChat: string;
    extendedLog: boolean;
    messages: {
        start: string;
    },
    default: {
        totalQuestions: number;
        typeOfQuestions: QuestionsType;
        difficulty: Difficulty
    }
};

export type QuestionsType = {
    ALL: null,
    SIMPLE: 'boolean',
    MULTIPLE: 'multiple'
}

export type Difficulty = {
    EASY: 'easy',
    MEDIUM: 'medium',
    HARD: 'hard'
}