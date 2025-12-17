import { Beatmap, Beatmapset } from '../../../types/general/beatmap';
import { UserCompact } from '../../../types/general/user';

export interface DirectBeatmap extends Omit<Beatmap, 'failtimes'> {}
