local sendScan = require('sendScan');
local int = require('interact');
local inv = component.inventory_controller;
local robot = require('robot');
local dta = require('doToArea');
local mas = require('moveAndScan');

local M = {};

M['scanArea'] = function(scanLevel)
  local result;
  if scanLevel == 1 then
    for i=-2,5 do
      result = sendScan.volume(-3, -3, i, 8, 8, 1)
    end
  elseif scanLevel == 1
    for i=-1,7 do
      result = sendScan.plane(i);
    end
  end
  return result;
end;

M['viewInventory'] = function()
  return int.sendInventoryData(-1);
end;

M['equip'] = function()
  inv.equip();
  int.sendInventoryMetadata(-1);
  int.sendSlotData(-1, robot.select());
  return e;
end;

M['dig'] = function(x1, y1, z1, x2, y2, z2, selectionIndex, scanLevel)
  return dta.digArea(x1, y1, z1, x2, y2, z2, selectionIndex, scanLevel);
end;

M['place'] = function(x1, y1, z1, x2, y2, z2, selectionIndex, scanLevel)
  return dta.placeArea(x1, y1, z1, x2, y2, z2, selectionIndex, scanLevel);
end;

M['move'] = function(x, y, z, selectionIndex, scanLevel)
  return mas.to(x, y, z, selectionIndex, scanLevel);
end;

M['interact'] = function()
  
end;

M['inspect'] = function()
  
end;

M['select'] = function()
  
end;

M['transfer'] = function()
  
end;

M['craft'] = function()
  
end;

M['raw'] = function()
  
end;

M['sendPosition'] = function()
  
end;

M['sendComponents'] = function()
  
end;

return M;