export class PlayerStats {
    guessed = 0;
    failed = 0;
    unanswered = 0;


    getTotal() {
        return this.guessed + this.failed + this.unanswered;
    }

    getCorrectScore() {
        return this.guessed / this.getTotal();
    }

    getFailedScore() {
        return this.failed / this.getTotal();
    }

    getStats() {
        return `${this.guessed}/${this.getTotal()}(${(Math.round(this.getCorrectScore() * 100))}%)`
    }
}