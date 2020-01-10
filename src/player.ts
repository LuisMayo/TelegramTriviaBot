import { User } from "telegraf/typings/telegram-types";
import { PlayerStats } from "./stats";

export class Player implements User {
    gameAdmin: boolean;
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    stats: PlayerStats;
    lastAnswer: number;
    consecutiveAusences: number;
    constructor(user: User, admin = false, unanswered = 0) {
        Object.assign(this, user);
        this.gameAdmin = admin;
        this.lastAnswer = null;
        this.consecutiveAusences = 0;
        this.stats = new PlayerStats();
        this.stats.unanswered = unanswered;
    }
    getStats() {
        return `(${this.getPlayerLink()}): ${this.stats.getStats()}`
    }

    getPlayerLink() {
        return `${this.first_name}](tg://user?id=${this.id}`;
    }
}
