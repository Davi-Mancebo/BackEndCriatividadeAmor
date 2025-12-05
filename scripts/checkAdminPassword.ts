import bcrypt from 'bcryptjs';

const hash = '$2a$10$RNkUlo05ORo/CzHh8/l99.XCYfdv53ou980l6H8QRjUxZwt.JN0Hi';

(async () => {
  const matches = await bcrypt.compare('admin123', hash);
  console.log('admin123 matches?', matches);
})();
