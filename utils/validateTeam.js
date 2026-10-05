export const MIN_MEMBERS = 4;
export const MAX_MEMBERS = 4;

const clean = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');

export function validateTeam(body) {
  const errors = {};
  const teamName = clean(body.teamName);
  const college = clean(body.college);
  const email = clean(body.email).toLowerCase();

  if (teamName.length < 2) errors.teamName = 'Enter your team name.';
  if (teamName.length > 80) errors.teamName = 'Team name is too long.';
  if (college.length < 3) errors.college = 'Enter your college name.';
  if (college.length > 150) errors.college = 'College name is too long.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) {
    errors.email = 'Enter a valid team email address.';
  }

  const raw = Array.isArray(body.members) ? body.members : [];
  if (raw.length !== MAX_MEMBERS) {
    errors.members = `A team must have exactly ${MAX_MEMBERS} members.`;
  }

  const seenPhones = new Set();

  const members = raw.slice(0, MAX_MEMBERS).map((m, i) => {
    m = m || {};
    const member = {
      name: clean(m.name),
      phone: clean(m.phone).replace(/\D/g, ''),
      course: clean(m.course),
    };
    if (member.phone.length === 12 && member.phone.startsWith('91')) member.phone = member.phone.slice(2);

    if (member.name.length < 2 || member.name.length > 80) errors[`members.${i}.name`] = 'Enter the member\u2019s full name.';
    if (!/^[6-9]\d{9}$/.test(member.phone)) errors[`members.${i}.phone`] = 'Enter a valid 10-digit mobile number.';
    if (member.course.length < 2 || member.course.length > 100) errors[`members.${i}.course`] = 'Enter the course.';

    if (member.phone && member.phone.length === 10) {
      if (seenPhones.has(member.phone)) {
        errors[`members.${i}.phone`] = 'Duplicate phone: Each member must have a unique phone number.';
      }
      seenPhones.add(member.phone);
    }

    return member;
  });

  return { data: { teamName, college, email, members }, errors };
}