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
    constructor(user: User, admin = false) {
        Object.assign(this, user);
        this.gameAdmin = admin;
        this.stats = new PlayerStats()
    }
    getStats() {
        return `[${this.first_name}](tg://user?id=${this.id}): ${this.stats.getStats()}`
    }
}
