import axios from "axios";
import Elysia from "elysia";

export const applicationAxiosInstance = axios.create();

export const axiosInstance = new Elysia({ name: "axiosInstance" }).decorate(
  () => ({
    applicationAxiosInstance,
  })
);
