import type { AddressInput, AddressPayload } from '@clenzy/shared';
import { isValidObjectId, type Types } from 'mongoose';
import { Address, type AddressDocument } from '../models/Address.js';
import { resolveAreaForPincode, toAreaPayload } from './areas.service.js';
import { AppError } from '../utils/AppError.js';

const MAX_ADDRESSES_PER_USER = 10;

type AddressLean = AddressDocument & { _id: unknown };

function toPayload(address: AddressLean): AddressPayload {
  return {
    id: String(address._id),
    label: address.label,
    contactName: address.contactName,
    contactPhone: address.contactPhone,
    line1: address.line1,
    line2: address.line2,
    landmark: address.landmark,
    area: address.area,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    geo: address.geo
      ? { lat: address.geo.coordinates[1], lng: address.geo.coordinates[0] }
      : undefined,
    serviceAreaId: address.serviceAreaId ? String(address.serviceAreaId) : undefined,
    isServiceable: Boolean(address.serviceAreaId),
    isDefault: address.isDefault,
  };
}

async function requireOwnAddress(userId: string, addressId: string): Promise<AddressLean> {
  if (!isValidObjectId(addressId)) throw AppError.notFound('Address not found.');
  const address = await Address.findOne({ _id: addressId, userId, deletedAt: null }).lean();
  if (!address) throw AppError.notFound('Address not found.');
  return address;
}

export async function listAddresses(userId: string): Promise<AddressPayload[]> {
  const addresses = await Address.find({ userId, deletedAt: null })
    .sort({ isDefault: -1, createdAt: -1 })
    .lean();
  return addresses.map(toPayload);
}

export async function getAddress(userId: string, addressId: string): Promise<AddressPayload> {
  return toPayload(await requireOwnAddress(userId, addressId));
}

export async function createAddress(userId: string, input: AddressInput): Promise<AddressPayload> {
  const existingCount = await Address.countDocuments({ userId, deletedAt: null });
  if (existingCount >= MAX_ADDRESSES_PER_USER) {
    throw AppError.conflict(
      'ADDRESS_LIMIT_REACHED',
      `You can save up to ${MAX_ADDRESSES_PER_USER} addresses.`,
    );
  }

  const { area, nearestAreas } = await resolveAreaForPincode(input.pincode);
  if (!area) {
    throw AppError.unprocessable(
      'AREA_NOT_SERVICEABLE',
      "We don't deliver to this pin code yet.",
      undefined,
      { nearestServiceableAreas: nearestAreas.map(toAreaPayload) },
    );
  }

  const isFirstAddress = existingCount === 0;
  const isDefault = isFirstAddress || Boolean(input.isDefault);

  if (isDefault) {
    await Address.updateMany({ userId, deletedAt: null }, { $set: { isDefault: false } });
  }

  const created = await Address.create({
    userId,
    label: input.label,
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    line1: input.line1,
    line2: input.line2,
    landmark: input.landmark,
    area: input.area,
    city: input.city,
    state: input.state,
    pincode: input.pincode,
    geo: input.geo ? { type: 'Point', coordinates: [input.geo.lng, input.geo.lat] } : undefined,
    serviceAreaId: area._id,
    isDefault,
  });

  return toPayload(created.toObject());
}

export async function updateAddress(
  userId: string,
  addressId: string,
  input: Partial<AddressInput>,
): Promise<AddressPayload> {
  const existing = await requireOwnAddress(userId, addressId);

  let serviceAreaId = existing.serviceAreaId;
  if (input.pincode && input.pincode !== existing.pincode) {
    const { area } = await resolveAreaForPincode(input.pincode);
    if (!area) {
      throw AppError.unprocessable(
        'AREA_NOT_SERVICEABLE',
        "We don't deliver to this pin code yet.",
      );
    }
    serviceAreaId = area._id as Types.ObjectId;
  }

  if (input.isDefault) {
    await Address.updateMany({ userId, deletedAt: null }, { $set: { isDefault: false } });
  }

  const updated = await Address.findByIdAndUpdate(
    addressId,
    {
      $set: {
        ...input,
        ...(input.geo
          ? { geo: { type: 'Point', coordinates: [input.geo.lng, input.geo.lat] } }
          : {}),
        serviceAreaId,
      },
    },
    { new: true },
  ).lean();

  if (!updated) throw AppError.notFound('Address not found.');
  return toPayload(updated);
}

export async function deleteAddress(userId: string, addressId: string): Promise<void> {
  await requireOwnAddress(userId, addressId);
  await Address.updateOne({ _id: addressId, userId }, { $set: { deletedAt: new Date() } });
}

export async function setDefaultAddress(
  userId: string,
  addressId: string,
): Promise<AddressPayload> {
  await requireOwnAddress(userId, addressId);
  await Address.updateMany({ userId, deletedAt: null }, { $set: { isDefault: false } });
  const updated = await Address.findByIdAndUpdate(
    addressId,
    { $set: { isDefault: true } },
    { new: true },
  ).lean();
  if (!updated) throw AppError.notFound('Address not found.');
  return toPayload(updated);
}
