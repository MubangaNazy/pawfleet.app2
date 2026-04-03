import { AppData } from '../types';

const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const now = new Date().toISOString();
const minus1h = new Date(Date.now() - 3600000).toISOString();
const minus2h = new Date(Date.now() - 7200000).toISOString();
const plus1d = new Date(Date.now() + 86400000).toISOString();
const plus2d = new Date(Date.now() + 172800000).toISOString();

export const SEED_DATA: AppData = {
  users: [
    { id: 'u1', name: 'Chanda Mutale', phone: '0977000001', email: 'chanda@pawfleet.zm', password: 'admin123', role: 'admin', createdAt: '2024-01-01T00:00:00Z' },
    { id: 'u2', name: "Bwalya Ng'andu", phone: '0977000002', email: 'bwalya@pawfleet.zm', password: 'walker123', role: 'walker', createdAt: '2024-01-05T00:00:00Z' },
    { id: 'u3', name: 'Mutinta Phiri', phone: '0977000003', email: 'mutinta@pawfleet.zm', password: 'walker123', role: 'walker', createdAt: '2024-01-08T00:00:00Z' },
    { id: 'u4', name: 'Mwape Kapata', phone: '0977000004', email: 'mwape@gmail.com', password: 'owner123', role: 'owner', createdAt: '2024-01-10T00:00:00Z' },
    { id: 'u5', name: 'Lubasi Tembo', phone: '0977000005', email: 'lubasi@gmail.com', password: 'owner123', role: 'owner', createdAt: '2024-01-12T00:00:00Z' },
  ],
  dogs: [
    {
      id: 'd1', name: 'Rex', breed: 'German Shepherd', age: 3, ownerId: 'u4',
      notes: 'Very energetic, loves long walks. Avoid other dogs.',
      healthLogs: [
        { date: today, water: true, foodMorning: true, foodEvening: false },
        { date: yesterday, water: true, foodMorning: true, foodEvening: true },
      ],
    },
    {
      id: 'd2', name: 'Coco', breed: 'Poodle', age: 2, ownerId: 'u4',
      notes: 'Friendly and playful. Loves treats.',
      healthLogs: [
        { date: today, water: false, foodMorning: true, foodEvening: false },
      ],
    },
    {
      id: 'd3', name: 'Bruno', breed: 'Labrador Retriever', age: 4, ownerId: 'u5',
      notes: 'Gentle giant. Good with children.',
      healthLogs: [
        { date: today, water: true, foodMorning: false, foodEvening: false },
      ],
    },
  ],
  walks: [
    { id: 'w1', dogId: 'd1', ownerId: 'u4', walkerId: 'u2', status: 'completed', scheduledDate: '2024-03-20T08:00:00Z', startTime: '2024-03-20T08:05:00Z', endTime: '2024-03-20T08:35:00Z', duration: 30, price: 150, walkerEarning: 100, startLocation: { lat: -15.4167, lng: 28.2833 }, endLocation: { lat: -15.4200, lng: 28.2900 }, createdAt: '2024-03-19T10:00:00Z' },
    { id: 'w2', dogId: 'd3', ownerId: 'u5', walkerId: 'u3', status: 'completed', scheduledDate: '2024-03-21T09:00:00Z', startTime: '2024-03-21T09:02:00Z', endTime: '2024-03-21T09:45:00Z', duration: 43, price: 150, walkerEarning: 100, createdAt: '2024-03-20T14:00:00Z' },
    { id: 'w3', dogId: 'd2', ownerId: 'u4', walkerId: 'u2', status: 'assigned', scheduledDate: minus1h, price: 150, walkerEarning: 100, createdAt: minus2h },
    { id: 'w4', dogId: 'd1', ownerId: 'u4', status: 'pending', scheduledDate: plus1d, price: 150, walkerEarning: 100, createdAt: now },
    { id: 'w5', dogId: 'd3', ownerId: 'u5', walkerId: 'u3', status: 'active', scheduledDate: minus2h, startTime: minus1h, startLocation: { lat: -15.4167, lng: 28.2833 }, price: 150, walkerEarning: 100, createdAt: minus2h },
    { id: 'w6', dogId: 'd2', ownerId: 'u4', walkerId: 'u2', status: 'completed', scheduledDate: '2024-03-22T10:00:00Z', startTime: '2024-03-22T10:02:00Z', endTime: '2024-03-22T10:40:00Z', duration: 38, price: 150, walkerEarning: 100, createdAt: '2024-03-21T15:00:00Z' },
    { id: 'w7', dogId: 'd1', ownerId: 'u4', walkerId: 'u2', status: 'completed', scheduledDate: '2024-03-23T08:00:00Z', startTime: '2024-03-23T08:05:00Z', endTime: '2024-03-23T08:45:00Z', duration: 40, price: 150, walkerEarning: 100, createdAt: '2024-03-22T10:00:00Z' },
    { id: 'w8', dogId: 'd3', ownerId: 'u5', walkerId: 'u3', status: 'completed', scheduledDate: '2024-03-23T09:00:00Z', startTime: '2024-03-23T09:02:00Z', endTime: '2024-03-23T09:50:00Z', duration: 48, price: 150, walkerEarning: 100, createdAt: '2024-03-22T12:00:00Z' },
    { id: 'w9', dogId: 'd1', ownerId: 'u4', status: 'pending', scheduledDate: plus2d, price: 150, walkerEarning: 100, createdAt: now },
  ],
  payments: [
    { id: 'p1', walkerId: 'u2', walkId: 'w1', amount: 100, status: 'paid', date: '2024-03-20T00:00:00Z', paidAt: '2024-03-22T00:00:00Z' },
    { id: 'p2', walkerId: 'u3', walkId: 'w2', amount: 100, status: 'unpaid', date: '2024-03-21T00:00:00Z' },
    { id: 'p3', walkerId: 'u2', walkId: 'w6', amount: 100, status: 'paid', date: '2024-03-22T00:00:00Z', paidAt: '2024-03-24T00:00:00Z' },
    { id: 'p4', walkerId: 'u2', walkId: 'w7', amount: 100, status: 'unpaid', date: '2024-03-23T00:00:00Z' },
    { id: 'p5', walkerId: 'u3', walkId: 'w8', amount: 100, status: 'unpaid', date: '2024-03-23T00:00:00Z' },
  ],
  walkerStats: [
    {
      walkerId: 'u2',
      points: 400,
      streak: 5,
      lastWalkDate: today,
      badges: [
        { id: 'first_walk', label: 'First Steps', description: 'Completed your first walk!', earnedAt: '2024-03-20T00:00:00Z', color: '#10B981', icon: '🐾' },
        { id: 'five_walks', label: '5 Walks Done', description: 'Completed 5 walks', earnedAt: '2024-03-22T00:00:00Z', color: '#4776E6', icon: '⭐' },
      ],
    },
    {
      walkerId: 'u3',
      points: 300,
      streak: 3,
      lastWalkDate: today,
      badges: [
        { id: 'first_walk', label: 'First Steps', description: 'Completed your first walk!', earnedAt: '2024-03-21T00:00:00Z', color: '#10B981', icon: '🐾' },
      ],
    },
  ],
};
