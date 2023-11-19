const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET_KEY } = process.env;
const nodemailer = require('../utils/nodemailer')
const emailResetPassword  = require('../views/templates')

module.exports = {
    register: async (req, res, next) => {
        try {
            let { name, email, password, password_confirmation } = req.body;
            if (password != password_confirmation) {
                res.locals.error = 'Please ensure the password and password confirmation match!';
                return res.redirect('/register');
            }

            let userExist = await prisma.users.findUnique({ where: { email } });
            if (userExist) {
                res.locals.error = 'User has already been used';
                return res.redirect('/register');
            }

            let encryptedPassword = await bcrypt.hash(password, 10);
            let user = await prisma.users.create({
                data: {
                    name,
                    email,
                    password: encryptedPassword
                }
            });

            await prisma.notifications.create({
                data: {
                    userId: user.id,
                    title: 'Register',
                    body: `Welcome to Nurul App, ${name}`
                }
            });
            return res.redirect('/login');
            
        } catch (err) {
            next(err);
        }
    },

    login: async (req, res, next) => {
        try {
            let { email, password } = req.body;

            let user = await prisma.users.findUnique({ where: { email } });
            if (!user) {
                res.locals.error = 'Invalid email or password';
                return res.redirect('/login');
            }

            let isPasswordCorrect = await bcrypt.compare(password, user.password);
            if (!isPasswordCorrect) {
                res.locals.error = 'Invalid email or password';
                return res.redirect('/login');
            }

            let token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET_KEY);

            return res.redirect('/dashboard');
        } catch (err) {
            next(err);
        }
    },

    forgotPassword: async (req, res, next) => {
        try {
            const { email } = req.body;

            const user = await prisma.users.findUnique({
                where: { email }
            });

            if (!user) {
                res.locals.error = 'User not found!';
                return res.redirect('/forgot-password');
            } else {
               const token = jwt.sign({
                id: user.id, name: user.name, email: user.email
               }, JWT_SECRET_KEY ); 

               const link = `http://localhost:4000/reset-password/?token=${token}`;
               const html = await nodemailer.getHtml('emailResetPassword.ejs', {name: user.name, link})

               await nodemailer.sendEmail({
                to: email, subject: 'Reset Password', html: html
               });

               res.locals.error = 'Password reset has been sent to email'
               res.redirect('/forgot-password');
            }
        } catch (err) {
            next(err);
        }
    },

    resetPassword: async (io, req, res, next) => {
        try {
            const { token } = req.query;

        const decoded = jwt.verify(token, JWT_SECRET_KEY);

        if (!decoded) {
            res.locals.error = 'Token is invalid';
            return res.redirect('/reset-password');
        }

        const { password, password_confirmation } = req.body;

        if (password != password_confirmation ) {
            res.locals.error = 'Please ensure passwor and confirmation password match!';
            return res.redirect('/reset-password');
        }

        await prisma.users.update({ where: { email: decoded.email },
        data: {
            password: await bcrypt.hash(password, 10)
        }});
        
        io.emit(`userId-${decoded.id}-notification`, {
            message: 'Update Password Succesfully',
            category: 'info'
        });

        await prisma.notifications.create({
            data: {
                userId: decoded.id,
                title: 'Reset Password,',
                body: 'Password updated successfully'
            }
        });

        res.redirect('/login');
        } catch (err) {
            next(err);
        } 
    }
};