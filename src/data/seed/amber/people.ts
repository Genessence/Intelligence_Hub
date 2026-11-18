// About 30 fictional users. Featured ones sit on top of the login directory (spec 6.5).
import type { Scope, UserProfile } from '@/data/types'

const s = (o: Partial<Scope> = {}): Scope => ({ plants: [], purchasingGroups: [], mrpControllers: [], commodities: [], projects: [], vendors: [], customers: [], ...o })

export const USERS: UserProfile[] = [
  // Featured
  { id: 'u-vikram', name: 'Vikram Rao', title: 'Managing Director', roleId: 'md', featured: true, scope: s({ all: true }), pitch: 'Top risks and value across the group, every morning.' },
  { id: 'u-anjali', name: 'Anjali Menon', title: 'Chief Financial Officer', roleId: 'cfo', featured: true, scope: s({ all: true }), pitch: 'Commodity exposure, PPV and value that SAP has proven.' },
  { id: 'u-rohit', name: 'Rohit Malhotra', title: 'Head of Sourcing', roleId: 'head_sourcing', featured: true, scope: s({ all: true }), pitch: 'Price moves and vendor risk before they hit a PO.' },
  { id: 'u-sneha', name: 'Sneha Iyer', title: 'Cost Engineer, Copper and Aluminium', roleId: 'cost_engineer', featured: true, scope: s({ commodities: ['Copper', 'Aluminium'] }), pitch: 'Should-cost variance the day an index moves.' },
  { id: 'u-arvind', name: 'Arvind Pillai', title: 'Head of R&D and NPD', roleId: 'head_rnd', featured: true, scope: s({ all: true }), pitch: 'Every gate at risk, and which other team caused it.' },
  { id: 'u-kavita', name: 'Kavita Joshi', title: 'NPD Project Manager, Coolwave programme', roleId: 'npd_pm', featured: true, scope: s({ projects: ['NCD-FY-2026-0041', 'RND-CW-2027'], customers: ['Coolwave'] }), pitch: 'Know when a part for my build is late, not after.' },
  { id: 'u-farhan', name: 'Farhan Qureshi', title: 'EXIM Manager', roleId: 'exim_manager', featured: true, scope: s({ shipmentsAll: true }), pitch: 'Who downstream is hurt by each late shipment.' },
  { id: 'u-manoj', name: 'Manoj Bhatt', title: 'Plant Head, Rajpura', roleId: 'plant_head', featured: true, scope: s({ plants: ['1001'] }), pitch: 'Material, machines and quality risk for my plant.' },
  // Directory
  { id: 'u-sanjay', name: 'Sanjay Kulkarni', title: 'Chief Operating Officer', roleId: 'coo', scope: s({ all: true }) },
  { id: 'u-priya', name: 'Priya Nair', title: 'Buyer, Compressor desk (P03)', roleId: 'buyer', scope: s({ purchasingGroups: ['P03'] }), delegate: { userId: 'u-nitin', from: '2026-11-12', to: '2026-11-20' } },
  { id: 'u-nitin', name: 'Nitin Bansal', title: 'Buyer, Copper desk (P01)', roleId: 'buyer', scope: s({ purchasingGroups: ['P01'] }) },
  { id: 'u-gaurav', name: 'Gaurav Sethi', title: 'Buyer, Motors and Electronics (P04, P06)', roleId: 'buyer', scope: s({ purchasingGroups: ['P04', 'P06'] }) },
  { id: 'u-meera', name: 'Meera Krishnan', title: 'Category Manager, Electro-mechanical', roleId: 'category_manager', scope: s({ commodities: ['Compressor', 'BLDC Motor'] }) },
  { id: 'u-harish', name: 'Harish Venkat', title: 'Category Manager, Metals', roleId: 'category_manager', scope: s({ commodities: ['Copper', 'Aluminium'], purchasingGroups: ['P01', 'P02'] }) },
  { id: 'u-tanvi', name: 'Tanvi Arora', title: 'Cost Engineer, Packaging', roleId: 'cost_engineer', scope: s({ commodities: ['EPS'] }) },
  { id: 'u-rahul', name: 'Rahul Saxena', title: 'NPD Project Manager, Nordis programme', roleId: 'npd_pm', scope: s({ projects: ['ECN-FY-2026-0011'], customers: ['Nordis'] }) },
  { id: 'u-divya', name: 'Divya Menon', title: 'Design Engineer, RAC', roleId: 'design_engineer', scope: s({ projects: ['RND-CW-2027', 'NCD-FY-2026-0041'] }) },
  { id: 'u-karan', name: 'Karan Mehta', title: 'Tooling Engineer, Moulds', roleId: 'tooling_engineer', scope: s({ commodities: ['EPS'], plants: ['1006', '1007'] }) },
  { id: 'u-ravi', name: 'Ravi Shankar', title: 'EXIM Executive, North imports', roleId: 'exim_executive', scope: s({ plants: ['1001', '1006', '1007'] }) },
  { id: 'u-pooja', name: 'Pooja Reddy', title: 'Head of Quality', roleId: 'head_quality', scope: s({ all: true }) },
  { id: 'u-imran', name: 'Imran Siddiqui', title: 'Supplier Quality Engineer, Electronics', roleId: 'sqe', scope: s({ plants: ['1008'], commodities: ['PCB'] }) },
  { id: 'u-deepak', name: 'Deepak Chauhan', title: 'Supply Chain Planner, Rajpura (MRP 101)', roleId: 'planner', scope: s({ plants: ['1001'], mrpControllers: ['101'] }) },
  { id: 'u-swati', name: 'Swati Patil', title: 'Supply Chain Planner, Supa (MRP 104)', roleId: 'planner', scope: s({ plants: ['1009'], mrpControllers: ['104'] }) },
  { id: 'u-asha', name: 'Asha Rawat', title: 'Stores In-charge, Rajpura', roleId: 'stores', scope: s({ plants: ['1001'] }) },
  { id: 'u-vivek', name: 'Vivek Joshi', title: 'Plant Head, Supa', roleId: 'plant_head', scope: s({ plants: ['1009'] }) },
  { id: 'u-neha', name: 'Neha Agarwal', title: 'Plant Head, Jhajjar', roleId: 'plant_head', scope: s({ plants: ['1006', '1007'] }) },
  { id: 'u-ramesh', name: 'Ramesh Iyengar', title: 'Finance Controller', roleId: 'finance_controller', scope: s({ all: true }) },
  { id: 'u-kiran', name: 'Kiran Bedi Rao', title: 'Key Account Manager, Coolwave', roleId: 'kam', scope: s({ customers: ['Coolwave'] }) },
  { id: 'u-aditya', name: 'Aditya Sood', title: 'Key Account Manager, Nordis', roleId: 'kam', scope: s({ customers: ['Nordis'] }) },
  { id: 'u-farah', name: 'Farah Khan', title: 'SAP Basis and Integration Lead', roleId: 'it_admin', scope: s({ all: true }) },
]
