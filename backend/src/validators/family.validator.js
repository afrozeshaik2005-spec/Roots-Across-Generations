import { z } from 'zod';

const todayEnd = () => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
};

export const createFamilySchema = z.object({
  name: z.string().min(1, 'Family name is required'),
  surname: z.string().min(1, 'Surname is required'),
  description: z.string().optional(),
  originVillageCity: z.string().optional(),
  
  // Optional profile details to create Founder member profile if not exists
  founderProfile: z.object({
    fullName: z.string().min(1, 'Full name is required'),
    nickname: z.string().optional(),
    dob: z.string().min(1, 'Date of birth is required').refine((val) => new Date(val) <= todayEnd(), 'Date of birth cannot be in the future'),
    gender: z.enum(['M', 'F', 'Other'], { required_error: 'Gender is required' }),
    birthPlace: z.string().optional(),
    birthVillageCity: z.string().optional(),
    bloodGroup: z.string().optional(),
    occupation: z.string().optional(),
    education: z.string().optional(),
    phone: z.string().min(1, 'Phone is required'),
    email: z.string().email('Invalid email format').optional().or(z.literal('')),
    bio: z.string().optional()
  }).optional()
});
