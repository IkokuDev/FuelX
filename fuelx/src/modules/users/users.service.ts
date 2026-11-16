import { AppError } from '../../lib/errors';
import { User } from '../../models/user.model';
import { toPublicUser, type PublicUser } from '../auth/auth.service';
import type { PushSubscriptionInput, UpdateMeInput } from './users.schemas';

export async function updateMe(userId: string, input: UpdateMeInput): Promise<PublicUser> {
  if (input.phone) {
    const clash = await User.findOne({ phone: input.phone, _id: { $ne: userId } }).lean();
    if (clash) throw new AppError('CONFLICT', 409, 'That phone number is already in use');
  }
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { ...(input.name ? { name: input.name } : {}), ...(input.phone ? { phone: input.phone } : {}) } },
    { new: true },
  );
  if (!user) throw new AppError('NOT_FOUND', 404, 'User not found');
  return toPublicUser(user);
}

export async function savePushSubscription(
  userId: string,
  input: PushSubscriptionInput,
): Promise<void> {
  await User.updateOne(
    { _id: userId },
    { $pull: { pushSubscriptions: { endpoint: input.endpoint } } },
  );
  await User.updateOne({ _id: userId }, { $push: { pushSubscriptions: input } });
}

export async function removePushSubscription(userId: string, endpoint: string): Promise<void> {
  await User.updateOne({ _id: userId }, { $pull: { pushSubscriptions: { endpoint } } });
}
