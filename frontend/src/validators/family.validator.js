import { z } from 'zod';

const todayEnd = () => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return today;
};

export const createFamilySchema = z.object({
  name: z.string().min(1, 'Family name is required'),
  surname: z.string().min(1, 'Surname is required'),
  description: z.string().optional().or(z.literal('')),
  originVillageCity: z.string().optional().or(z.literal('')),
  
  founderProfile: z.object({
    fullName: z.string().min(1, 'Full name is required'),
    nickname: z.string().optional().or(z.literal('')),
    dob: z.string().min(1, 'Date of birth is required').refine((val) => new Date(val) <= todayEnd(), 'Date of birth cannot be in the future'),
    gender: z.enum(['M', 'F', 'Other'], { required_error: 'Gender is required' }),
    birthPlace: z.string().optional().or(z.literal('')),
    birthVillageCity: z.string().optional().or(z.literal('')),
    bloodGroup: z.string().optional().or(z.literal('')),
    occupation: z.string().optional().or(z.literal('')),
    education: z.string().optional().or(z.literal('')),
    phone: z.string().min(1, 'Phone number is required'),
    email: z.string().email('Invalid email format').optional().or(z.literal('')),
    bio: z.string().optional().or(z.literal(''))
  })
});
