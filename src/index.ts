import { Conf } from "./conf";
import * as fs from 'fs';
import * as Telegraf from 'telegraf';

const version = '1.0.0';
const confPath = process.argv[2] || './conf';
const conf: Conf = JSON.parse(fs.readFileSync(confPath + '/conf.json', { encoding: 'UTF-8' }));
const bot = new Telegraf.default(conf.token);