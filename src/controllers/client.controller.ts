import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiBody,
  ApiQuery 
} from '@nestjs/swagger';
import { ClientService } from '../services/client.service';
import { CreateClientDto, UpdateClientDto, AddContactDto } from '../dtos/client.dto';

@ApiTags('Clients')
@Controller('clients')
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get all clients',
    description: 'Retrieve a list of all clients with optional pagination'
  })
  @ApiResponse({ status: 200, description: 'List of clients retrieved successfully' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAllClients(
    @Query() query: { page?: number; limit?: number }
  ) {
    return this.clientService.findAll(query);
  }

  @Post()
  @ApiOperation({ 
    summary: 'Create client',
    description: 'Create a new client profile'
  })
  @ApiResponse({ status: 201, description: 'Client created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid client data' })
  @ApiBody({ type: CreateClientDto })
  async createClient(@Body() clientData: CreateClientDto) {
    return this.clientService.create(clientData);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get client by ID',
    description: 'Retrieve detailed information about a specific client'
  })
  @ApiResponse({ status: 200, description: 'Client found' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  async getClient(@Param('id') id: string) {
    return this.clientService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'Update client',
    description: 'Update client profile information'
  })
  @ApiResponse({ status: 200, description: 'Client updated successfully' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @ApiResponse({ status: 400, description: 'Invalid update data' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiBody({ type: UpdateClientDto })
  async updateClient(
    @Param('id') id: string,
    @Body() clientData: UpdateClientDto
  ) {
    return this.clientService.update(id, clientData);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete client',
    description: 'Delete a client profile'
  })
  @ApiResponse({ status: 200, description: 'Client deleted successfully' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  async deleteClient(@Param('id') id: string) {
    return this.clientService.delete(id);
  }

  @Get(':id/workers')
  @ApiOperation({ 
    summary: 'Get client workers',
    description: 'Retrieve all workers associated with a client'
  })
  @ApiResponse({ status: 200, description: 'Workers retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  async getClientWorkers(@Param('id') id: string) {
    return this.clientService.getWorkers(id);
  }

  @Get(':id/contracts')
  @ApiOperation({ 
    summary: 'Get client contracts',
    description: 'Retrieve all contracts associated with a client'
  })
  @ApiResponse({ status: 200, description: 'Contracts retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  async getClientContracts(@Param('id') id: string) {
    return this.clientService.getContracts(id);
  }

  @Get(':id/billing')
  @ApiOperation({ 
    summary: 'Get client billing',
    description: 'Retrieve billing information for a client'
  })
  @ApiResponse({ status: 200, description: 'Billing information retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  async getClientBilling(@Param('id') id: string) {
    return this.clientService.getBilling(id);
  }

  @Post(':id/contacts')
  @ApiOperation({ 
    summary: 'Add client contact',
    description: 'Add a new contact to client profile'
  })
  @ApiResponse({ status: 201, description: 'Contact added successfully' })
  @ApiResponse({ status: 404, description: 'Client not found' })
  @ApiResponse({ status: 400, description: 'Invalid contact data' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiBody({ type: AddContactDto })
  async addClientContact(
    @Param('id') id: string,
    @Body() contactData: AddContactDto
  ) {
    return this.clientService.addContact(id, contactData);
  }

  @Put(':id/contacts/:contactId')
  @ApiOperation({ 
    summary: 'Update client contact',
    description: 'Update an existing contact for a client'
  })
  @ApiResponse({ status: 200, description: 'Contact updated successfully' })
  @ApiResponse({ status: 404, description: 'Client or contact not found' })
  @ApiResponse({ status: 400, description: 'Invalid contact data' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiParam({ name: 'contactId', description: 'Contact ID' })
  @ApiBody({ type: AddContactDto })
  async updateClientContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string,
    @Body() updateData: AddContactDto
  ) {
    return this.clientService.updateContact(id, contactId, updateData);
  }

  @Delete(':id/contacts/:contactId')
  @ApiOperation({ 
    summary: 'Delete client contact',
    description: 'Remove a contact from client profile'
  })
  @ApiResponse({ status: 200, description: 'Contact deleted successfully' })
  @ApiResponse({ status: 404, description: 'Client or contact not found' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  @ApiParam({ name: 'contactId', description: 'Contact ID' })
  async deleteClientContact(
    @Param('id') id: string,
    @Param('contactId') contactId: string
  ) {
    return this.clientService.deleteContact(id, contactId);
  }
}