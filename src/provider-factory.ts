import { ProviderList, Provider } from "./providers/providers";
import { OpenTriviaHandler } from "./providers/openTrivia";

export class ProviderFactory {
    static getProvider(provider: ProviderList): Provider {
        switch (provider) {
            case ProviderList.TRIVIADB:
                return new OpenTriviaHandler();
                break;
            default:
                return null;
        }
    }
}