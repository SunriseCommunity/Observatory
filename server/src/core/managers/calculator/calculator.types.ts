import * as rosu from 'osu-pp-js';
import { GameModBitwise } from '../../../types/general/gameMod';

export interface Score extends ScoreShort {
    n300?: number;
    nGeki?: number;
    n100?: number;
    nKatu?: number;
    n50?: number;
}

export interface ScoreShort {
    accuracy?: number;
    mods?: GameModBitwise;
    mode?: rosu.GameMode;
    combo?: number;
    misses?: number;
    isScoreFailed: boolean;
    isLazer: boolean;
}
