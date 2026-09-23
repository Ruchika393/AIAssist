import express from "express";
import {login, Logout, signUp} from "../controllers/auth.controllers.js";
const authRouter = express.Router();

authRouter.post('/signup', signUp);
authRouter.post('/login', login);
authRouter.get('/logout', Logout);

export default authRouter;