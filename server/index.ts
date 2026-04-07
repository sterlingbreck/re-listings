import express from 'express';
import cors from 'cors';
import {
  createListing,
  deleteListing,
  getAllListings,
  moveListing,
  updateListing,
} from './db.js';
import { scrapeListing } from './scraper.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/listings', (_req, res) => {
  res.json(getAllListings());
});

app.post('/api/scrape', async (req, res) => {
  const { url } = req.body ?? {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }
  try {
    const result = await scrapeListing(url);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/listings', (req, res) => {
  const { url, thumbnail, price, address, city, bedrooms, bathrooms, comments } = req.body ?? {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url is required' });
  }
  try {
    const listing = createListing({
      url,
      thumbnail: thumbnail ?? null,
      price: price != null && price !== '' ? Number(price) : null,
      address: address ?? null,
      city: city ?? null,
      bedrooms: bedrooms != null && bedrooms !== '' ? Number(bedrooms) : null,
      bathrooms: bathrooms != null && bathrooms !== '' ? Number(bathrooms) : null,
      comments: comments ?? null,
    });
    res.status(201).json(listing);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('UNIQUE')) {
      return res.status(409).json({ error: 'A listing with that URL already exists' });
    }
    res.status(500).json({ error: msg });
  }
});

app.put('/api/listings/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'invalid id' });
  const { thumbnail, price, address, city, bedrooms, bathrooms, comments } = req.body ?? {};
  const updated = updateListing(id, {
    thumbnail: thumbnail !== undefined ? thumbnail || null : undefined,
    price:
      price === undefined
        ? undefined
        : price === null || price === ''
          ? null
          : Number(price),
    address: address !== undefined ? address || null : undefined,
    city: city !== undefined ? city || null : undefined,
    bedrooms:
      bedrooms === undefined
        ? undefined
        : bedrooms === null || bedrooms === ''
          ? null
          : Number(bedrooms),
    bathrooms:
      bathrooms === undefined
        ? undefined
        : bathrooms === null || bathrooms === ''
          ? null
          : Number(bathrooms),
    comments: comments !== undefined ? comments || null : undefined,
  });
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.json(updated);
});

app.post('/api/listings/:id/move', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'invalid id' });
  const direction = req.body?.direction;
  if (direction !== 'up' && direction !== 'down') {
    return res.status(400).json({ error: 'direction must be "up" or "down"' });
  }
  const moved = moveListing(id, direction);
  res.json({ moved, listings: getAllListings() });
});

app.delete('/api/listings/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'invalid id' });
  const ok = deleteListing(id);
  if (!ok) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
});

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
