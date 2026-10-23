import mongoose from 'mongoose';
import '../src/config/env.js';

import { connectDB } from '../src/config/db.js';

import {
  User,
  Company,
  Contact,
  Lead,
  Deal,
  Task,
} from '../src/models/index.js';

const DEMO_TAG = 'clientflow-demo';

async function seedData() {
  try {
    await connectDB();

    // Find the existing administrator.
    const admin = await User.findOne({ role: 'admin' });

    if (!admin) {
      throw new Error(
        'No administrator found. Run npm run seed:admin first.'
      );
    }

    console.log(`Seeding demo data for ${admin.email}...`);

    // Remove only records previously created by this demo script.
    await Promise.all([
      Company.deleteMany({
        owner: admin._id,
        tags: DEMO_TAG,
      }),
      Contact.deleteMany({
        owner: admin._id,
        tags: DEMO_TAG,
      }),
      Lead.deleteMany({
        owner: admin._id,
        tags: DEMO_TAG,
      }),
      Deal.deleteMany({
        owner: admin._id,
        description: DEMO_TAG,
      }),
      Task.deleteMany({
        assignedTo: admin._id,
        description: DEMO_TAG,
      }),
    ]);

    // 1. COMPANIES
    const companyData = [
      {
        name: 'TechNova Solutions',
        website: 'https://example.com',
        industry: 'Information Technology',
        size: '51-200',
        annualRevenue: 2500000,
        city: 'Delhi',
        state: 'Delhi',
        country: 'India',
      },
      {
        name: 'BrightFuture Education',
        website: 'https://example.com',
        industry: 'Education',
        size: '11-50',
        annualRevenue: 850000,
        city: 'Dehradun',
        state: 'Uttarakhand',
        country: 'India',
      },
      {
        name: 'GreenLeaf Retail',
        website: 'https://example.com',
        industry: 'Retail',
        size: '51-200',
        annualRevenue: 1800000,
        city: 'Noida',
        state: 'Uttar Pradesh',
        country: 'India',
      },
      {
        name: 'CloudBridge Systems',
        website: 'https://example.com',
        industry: 'Software',
        size: '11-50',
        annualRevenue: 1200000,
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
      },
      {
        name: 'UrbanSpace Designs',
        website: 'https://example.com',
        industry: 'Real Estate',
        size: '1-10',
        annualRevenue: 500000,
        city: 'Gurugram',
        state: 'Haryana',
        country: 'India',
      },
    ];

    const companies = await Company.insertMany(
      companyData.map((company) => ({
        ...company,
        owner: admin._id,
        createdBy: admin._id,
        tags: [DEMO_TAG],
        description: DEMO_TAG,
      }))
    );

    console.log(`Created ${companies.length} companies.`);

    // 2. CONTACTS
    const contactData = [
      ['Aarav', 'Sharma', 'aarav@example.com', 'Sales Director'],
      ['Priya', 'Verma', 'priya@example.com', 'Marketing Manager'],
      ['Rahul', 'Singh', 'rahul@example.com', 'CEO'],
      ['Ananya', 'Gupta', 'ananya@example.com', 'HR Manager'],
      ['Rohan', 'Mehta', 'rohan@example.com', 'IT Manager'],
      ['Sneha', 'Joshi', 'sneha@example.com', 'Product Manager'],
      ['Karan', 'Malhotra', 'karan@example.com', 'Business Analyst'],
      ['Isha', 'Kapoor', 'isha@example.com', 'Operations Manager'],
      ['Aditya', 'Rao', 'aditya@example.com', 'Founder'],
      ['Neha', 'Mishra', 'neha@example.com', 'Finance Manager'],
    ];

    const contacts = await Contact.insertMany(
      contactData.map((contact, index) => ({
        firstName: contact[0],
        lastName: contact[1],
        email: contact[2],
        jobTitle: contact[3],
        phone: `+91 90000000${String(index).padStart(2, '0')}`,
        company: companies[index % companies.length]._id,
        owner: admin._id,
        createdBy: admin._id,
        city: companies[index % companies.length].city,
        country: 'India',
        tags: [DEMO_TAG],
        notes: 'Demo contact created by the seed script.',
      }))
    );

    console.log(`Created ${contacts.length} contacts.`);

    // 3. LEADS
    const leadStatuses = [
      'New',
      'Contacted',
      'Qualified',
      'New',
      'Contacted',
      'Qualified',
      'Converted',
      'New',
      'Unqualified',
      'Qualified',
    ];

    const priorities = [
      'High',
      'Medium',
      'Urgent',
      'Low',
      'High',
      'Medium',
      'High',
      'Low',
      'Medium',
      'Urgent',
    ];

    const leads = await Lead.insertMany(
      contactData.map((contact, index) => ({
        firstName: contact[0],
        lastName: contact[1],
        email: `lead${index + 1}@example.com`,
        phone: `+91 91000000${String(index).padStart(2, '0')}`,
        company: companies[index % companies.length].name,
        jobTitle: contact[3],
        source: [
          'Website',
          'Referral',
          'Social media',
          'Email campaign',
          'Advertisement',
        ][index % 5],
        status: leadStatuses[index],
        priority: priorities[index],
        owner: admin._id,
        createdBy: admin._id,
        estimatedValue: (index + 1) * 15000,
        nextFollowUp: new Date(
          Date.now() + (index + 1) * 86400000
        ),
        description: `Demo lead for ${companies[index % companies.length].name}.`,
        tags: [DEMO_TAG],
      }))
    );

    console.log(`Created ${leads.length} leads.`);

    // 4. DEALS
    const stages = [
      'Qualification',
      'Discovery',
      'Proposal',
      'Negotiation',
      'Won',
      'Lost',
      'Qualification',
      'Discovery',
      'Proposal',
      'Negotiation',
    ];

    const deals = await Deal.insertMany(
      stages.map((stage, index) => ({
        title: `${companies[index % companies.length].name} - Project ${index + 1}`,
        owner: admin._id,
        createdBy: admin._id,
        lead: leads[index]._id,
        contact: contacts[index]._id,
        company: companies[index % companies.length]._id,
        value: (index + 1) * 25000,
        currency: 'INR',
        stage,
        probability: {
          Qualification: 10,
          Discovery: 25,
          Proposal: 50,
          Negotiation: 75,
          Won: 100,
          Lost: 0,
        }[stage],
        expectedCloseDate: new Date(
          Date.now() + (index + 30) * 86400000
        ),
        actualCloseDate:
          stage === 'Won' || stage === 'Lost'
            ? new Date()
            : undefined,
        description: DEMO_TAG,
      }))
    );

    console.log(`Created ${deals.length} deals.`);

    // 5. TASKS
    const taskTypes = [
      'Call',
      'Email',
      'Meeting',
      'Follow-up',
      'Demo',
      'General',
    ];

    const tasks = await Task.insertMany(
      Array.from({ length: 10 }, (_, index) => ({
        title: [
          'Call prospective customer',
          'Send product proposal',
          'Schedule discovery meeting',
          'Follow up with lead',
          'Prepare product demo',
          'Review sales pipeline',
          'Contact qualified lead',
          'Send pricing details',
          'Discuss contract terms',
          'Complete customer onboarding',
        ][index],
        description: DEMO_TAG,
        type: taskTypes[index % taskTypes.length],
        dueDate: new Date(
          Date.now() + (index - 2) * 86400000
        ),
        priority: priorities[index],
        status: [
          'Pending',
          'In Progress',
          'Completed',
          'Pending',
          'Pending',
          'In Progress',
          'Pending',
          'Completed',
          'Pending',
          'Pending',
        ][index],
        assignedTo: admin._id,
        createdBy: admin._id,
        lead: leads[index]._id,
        deal: deals[index]._id,
      }))
    );

    console.log(`Created ${tasks.length} tasks.`);

    console.log('\n================================');
    console.log('CLIENTFLOW CRM SEED COMPLETED');
    console.log('================================');
    console.log(`Admin: ${admin.email}`);
    console.log(`Companies: ${companies.length}`);
    console.log(`Contacts: ${contacts.length}`);
    console.log(`Leads: ${leads.length}`);
    console.log(`Deals: ${deals.length}`);
    console.log(`Tasks: ${tasks.length}`);
    console.log('================================\n');
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

await seedData();