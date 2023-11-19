require('dotenv').config();
const express = require('express');
const app = express();
const morgan = require('morgan');
const { PORT, SENTRY_DSN, RAILWAY_ENVIRONMENT_NAME } = process.env;
const Sentry = require('@sentry/node');

Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
        // enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // enable Express.js middleware tracing
        new Sentry.Integrations.Express({ app }),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0,
    environment: RAILWAY_ENVIRONMENT_NAME
});

app.use(morgan('dev'));
app.use(express.json());
app.set('view engine', 'ejs')

// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());

// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

app.get('/', (req, res) => {
    res.render('register', register);
});

const authRouter = require('./routes/auth.routes');
const { register } = require('./controllers/auth.controllers');
app.use(authRouter);

// The error handler must be registered before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());

//404
app.use((req, res, next) => {
    res.status(404).json({
        status: false,
        message: 'Not Found!',
        error: null,
        data: null
    });
});


//500
app.use((err, req, res, next) => {
    res.status(500).json({
        status: false,
        message: 'Internal Message Error!',
        error: err.message,
        data: {
            env: RAILWAY_ENVIRONMENT_NAME
        }
    });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));