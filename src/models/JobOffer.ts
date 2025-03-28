import mongoose from 'mongoose';
import { IJobOffer } from '../interfaces/job-offer.interface';
import { JobOfferSchema } from '../schemas/job-offer.schema';

export const JobOffer = mongoose.model<IJobOffer>('JobOffer', JobOfferSchema);

// Helper methods
export const createJobOffer = async (offerData: Partial<IJobOffer>): Promise<IJobOffer> => {
  const jobOffer = new JobOffer(offerData);
  
  // Add initial history entry
  jobOffer.history = [{
    status: jobOffer.status,
    date: new Date(),
    updatedBy: jobOffer.createdBy,
    notes: 'Initial job offer created'
  }];
  
  return await jobOffer.save();
};

export const updateJobOfferStatus = async (
  jobOfferId: string, 
  status: string, 
  updatedBy: string, 
  notes?: string
): Promise<IJobOffer | null> => {
  const jobOffer = await JobOffer.findById(jobOfferId);
  
  if (!jobOffer) {
    return null;
  }
  
  jobOffer.status = status as any;
  jobOffer.updatedBy = updatedBy as any;
  
  if (status === 'accepted' || status === 'rejected') {
    jobOffer.responseDate = new Date();
  }
  
  // Add history entry
  jobOffer.history.push({
    status: status as any,
    date: new Date(),
    updatedBy: updatedBy as any,
    notes
  });
  
  return await jobOffer.save();
}; 