-- Two-step device return: rider submits → office confirms receipt

alter table requests
  add column if not exists return_submitted_at   timestamptz,  -- rider pressed "ส่งคืนแล้ว"
  add column if not exists returned_to_office_at timestamptz;  -- admin/office pressed "ยืนยันรับเครื่อง"
