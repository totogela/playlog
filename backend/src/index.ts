import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:3000' }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// TODO: montar rutas por módulo
// app.use('/api/auth',            authRouter);
// app.use('/api/games',           gamesRouter);
// app.use('/api/ratings',         ratingsRouter);
// app.use('/api/profile',         profileRouter);
// app.use('/api/recommendations', recommendationsRouter);
// app.use('/api/wrapped',         wrappedRouter);

app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});
