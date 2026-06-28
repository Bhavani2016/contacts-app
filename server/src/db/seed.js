const { v4: uuidv4 } = require('uuid');
const repository = require('./index');

const sample = [
  ['Ada', 'Lovelace', 'ada.lovelace@example.com', '+14155550101', ['engineering', 'vip']],
  ['Grace', 'Hopper', 'grace.hopper@example.com', '+14155550102', ['engineering']],
  ['Alan', 'Turing', 'alan.turing@example.com', '+44207946100', ['engineering', 'research']],
  ['Margaret', 'Hamilton', 'margaret.hamilton@example.com', '+14155550104', ['engineering']],
  ['Katherine', 'Johnson', 'katherine.johnson@example.com', '+14155550105', ['research']],
  ['Tim', 'Berners-Lee', 'tim.bl@example.com', '+44207946200', ['web']],
  ['Linus', 'Torvalds', 'linus.torvalds@example.com', '+358401234567', ['engineering', 'oss']],
  ['Barbara', 'Liskov', 'barbara.liskov@example.com', '+14155550108', ['research']],
  ['Donald', 'Knuth', 'donald.knuth@example.com', '+14155550109', ['research', 'oss']],
  ['Radia', 'Perlman', 'radia.perlman@example.com', '+14155550110', ['engineering']],
  ['Vint', 'Cerf', 'vint.cerf@example.com', '+14155550111', ['web', 'vip']],
  ['Hedy', 'Lamarr', 'hedy.lamarr@example.com', '+14155550112', []],
];

(async () => {
  try {
    await repository.init();
    await repository.clearAll();
    const now = new Date().toISOString();
    for (const [firstName, lastName, email, phone, tags] of sample) {
      // eslint-disable-next-line no-await-in-loop
      await repository.create({
        id: uuidv4(),
        firstName,
        lastName,
        email,
        phone,
        tags,
        createdAt: now,
        updatedAt: now,
      });
    }
    console.log(`Seeded ${sample.length} contacts.`);
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
})();
