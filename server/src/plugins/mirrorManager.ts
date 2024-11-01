import axios from 'axios';
import Elysia from 'elysia';
import { MirrorManager } from '../core/managers/mirror.manager';

export const mirrorManagerInstance = new MirrorManager();

export const mirrorManager = new Elysia({ name: 'mirrorManager' }).decorate(
    () => ({
        mirrorManagerInstance,
    }),
);
