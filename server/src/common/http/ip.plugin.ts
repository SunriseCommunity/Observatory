import { Elysia } from "elysia";
import { ip } from "elysia-ip";

export const ipPlugin = new Elysia({ name: "IPPlugin" }).use(ip());
