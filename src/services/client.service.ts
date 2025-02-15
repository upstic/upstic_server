import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IClient, IContact, IUser } from '../interfaces/models.interface';
import { logger } from '../utils/logger';
import { LogMetadata } from '../interfaces/logger.interface';

@Injectable()
export class ClientService {
  constructor(
    @InjectModel('Client') private readonly clientModel: Model<IClient>,
  ) {}

  async findAll(): Promise<IClient[]> {
    try {
      return await this.clientModel.find().exec();
    } catch (error) {
      logger.error('Error finding all clients:', { error } as LogMetadata);
      throw error;
    }
  }

  async findOne(id: string): Promise<IClient> {
    try {
      const client = await this.clientModel.findById(id).exec();
      if (!client) {
        throw new Error(`Client with id ${id} not found`);
      }
      return client;
    } catch (error) {
      logger.error('Error finding client:', { error, id } as LogMetadata);
      throw error;
    }
  }

  async create(client: Partial<IClient>): Promise<IClient> {
    try {
      const newClient = new this.clientModel(client);
      return await newClient.save();
    } catch (error) {
      logger.error('Error creating client:', { error } as LogMetadata);
      throw error;
    }
  }

  async update(id: string, client: Partial<IClient>): Promise<IClient> {
    try {
      const updatedClient = await this.clientModel
        .findByIdAndUpdate(id, client, { new: true })
        .exec();
      if (!updatedClient) {
        throw new Error(`Client with id ${id} not found`);
      }
      return updatedClient;
    } catch (error) {
      logger.error('Error updating client:', { error, id } as LogMetadata);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const result = await this.clientModel.findByIdAndDelete(id).exec();
      if (!result) {
        throw new Error(`Client with id ${id} not found`);
      }
    } catch (error) {
      logger.error('Error deleting client:', { error, id } as LogMetadata);
      throw error;
    }
  }

  async getWorkers(clientId: string): Promise<any[]> {
    try {
      const client = await this.findOne(clientId);
      return client.workers || [];
    } catch (error) {
      logger.error('Error getting workers:', { error, clientId } as LogMetadata);
      throw error;
    }
  }

  async getContracts(clientId: string): Promise<any[]> {
    try {
      const client = await this.findOne(clientId);
      return client.contracts || [];
    } catch (error) {
      logger.error('Error getting contracts:', { error, clientId } as LogMetadata);
      throw error;
    }
  }

  async getBilling(clientId: string): Promise<any> {
    try {
      const client = await this.findOne(clientId);
      return client.billing || {};
    } catch (error) {
      logger.error('Error getting billing:', { error, clientId } as LogMetadata);
      throw error;
    }
  }

  async addContact(clientId: string, contact: IContact): Promise<IClient> {
    try {
      const client = await this.findOne(clientId);
      client.contacts = client.contacts || [];
      client.contacts.push(contact);
      return await this.update(clientId, client);
    } catch (error) {
      logger.error('Error adding contact:', { error, clientId } as LogMetadata);
      throw error;
    }
  }

  async updateContact(clientId: string, contactId: string, contact: Partial<IContact>): Promise<IClient> {
    try {
      const client = await this.findOne(clientId);
      const contactIndex = client.contacts?.findIndex(c => c._id.toString() === contactId);
      if (contactIndex === -1 || contactIndex === undefined) {
        throw new Error(`Contact with id ${contactId} not found`);
      }
      client.contacts[contactIndex] = { ...client.contacts[contactIndex], ...contact };
      return await this.update(clientId, client);
    } catch (error) {
      logger.error('Error updating contact:', { error, clientId, contactId } as LogMetadata);
      throw error;
    }
  }

  async deleteContact(clientId: string, contactId: string): Promise<IClient> {
    try {
      const client = await this.findOne(clientId);
      client.contacts = client.contacts?.filter(c => c._id.toString() !== contactId) || [];
      return await this.update(clientId, client);
    } catch (error) {
      logger.error('Error deleting contact:', { error, clientId, contactId } as LogMetadata);
      throw error;
    }
  }

  async createProfile(userId: string, userData?: any): Promise<IClient> {
    try {
      const client = new this.clientModel({ userId });
      await client.save();
      logger.info('Client profile created', { userId });
      return client;
    } catch (error) {
      logger.error('Error creating client profile:', error);
      throw error;
    }
  }
}