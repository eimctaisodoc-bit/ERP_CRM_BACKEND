const salesSchema=require('../../Usersmodel/staff/staff.Sales.Schema.js');

const createSalesReport = (req, res) => {
  // Logic to create a sales report
  res.status(201).json({ success: true, message: 'Sales report created successfully' });
};


const getSalesReport = (req, res) => {
  // Logic to retrieve sales reports
  res.status(200).json({ success: true, data: [] }); // Replace with actual data
};

module.exports = {  createSalesReport, getSalesReport };