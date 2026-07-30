CREATE UNIQUE INDEX "sulfur_prices_date_commodity_uidx" ON "sulfur_prices" USING btree ("date","commodity_code");--> statement-breakpoint
CREATE UNIQUE INDEX "port_inventory_date_commodity_uidx" ON "port_inventory" USING btree ("date","commodity_code");
