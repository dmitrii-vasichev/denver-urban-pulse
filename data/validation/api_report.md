# Denver Open Data API Validation Report

Generated: 2026-03-13 17:40:12

## Summary

| Dataset | Status | Records | Date Range |
|---------|--------|---------|------------|
| crime | OK | 349,141 | 2021-01-01 → 2026-03-09 |
| traffic_accidents | OK | 282,244 | 2013-01-01 → 2026-03-09 |
| 311_rolling | OK | 435,129 | 2025-03-12 → 2026-03-12 |
| 311_2023 | OK | 474,695 | 2023-01-01 → 2023-12-31 |
| neighborhoods | OK | 78 | N/A |

## Endpoints

### crime
- **URL:** `https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_CRIME_OFFENSES_P/FeatureServer/324`
- **Records:** 349,141
- **Date field:** `REPORTED_DATE`
- **Range:** 2021-01-01 → 2026-03-09

**Fields (21):**

| Field | Type | Alias |
|-------|------|-------|
| `OBJECTID` | esriFieldTypeOID | OBJECTID |
| `INCIDENT_ID` | esriFieldTypeString | INCIDENT_ID |
| `OFFENSE_ID` | esriFieldTypeString | OFFENSE_ID |
| `OFFENSE_CODE` | esriFieldTypeString | OFFENSE_CODE |
| `OFFENSE_CODE_EXTENSION` | esriFieldTypeSmallInteger | OFFENSE_CODE_EXTENSION |
| `OFFENSE_TYPE_ID` | esriFieldTypeString | OFFENSE_TYPE_ID |
| `OFFENSE_CATEGORY_ID` | esriFieldTypeString | OFFENSE_CATEGORY_ID |
| `FIRST_OCCURRENCE_DATE` | esriFieldTypeDate | FIRST_OCCURRENCE_DATE |
| `LAST_OCCURRENCE_DATE` | esriFieldTypeDate | LAST_OCCURRENCE_DATE |
| `REPORTED_DATE` | esriFieldTypeDate | REPORTED_DATE |
| `INCIDENT_ADDRESS` | esriFieldTypeString | INCIDENT_ADDRESS |
| `GEO_X` | esriFieldTypeInteger | GEO_X |
| `GEO_Y` | esriFieldTypeInteger | GEO_Y |
| `GEO_LON` | esriFieldTypeDouble | GEO_LON |
| `GEO_LAT` | esriFieldTypeDouble | GEO_LAT |
| `DISTRICT_ID` | esriFieldTypeString | DISTRICT_ID |
| `PRECINCT_ID` | esriFieldTypeString | PRECINCT_ID |
| `NEIGHBORHOOD_ID` | esriFieldTypeString | NEIGHBORHOOD_ID |
| `IS_CRIME` | esriFieldTypeSmallInteger | IS_CRIME |
| `IS_TRAFFIC` | esriFieldTypeSmallInteger | IS_TRAFFIC |
| `VICTIM_COUNT` | esriFieldTypeDouble | VICTIM_COUNT |

### traffic_accidents
- **URL:** `https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_CRIME_TRAFFICACCIDENTS5YR_P/FeatureServer/325`
- **Records:** 282,244
- **Date field:** `reported_date`
- **Range:** 2013-01-01 → 2026-03-09
- **Notes:** Cannot fetch sample record

**Fields (47):**

| Field | Type | Alias |
|-------|------|-------|
| `object_id` | esriFieldTypeOID | object_id |
| `incident_id` | esriFieldTypeString | incident_id |
| `offense_id` | esriFieldTypeString | offense_id |
| `offense_code` | esriFieldTypeString | offense_code |
| `offense_code_extension` | esriFieldTypeString | offense_code_extension |
| `top_traffic_accident_offense` | esriFieldTypeString | top_traffic_accident_offense |
| `first_occurrence_date` | esriFieldTypeDate | first_occurrence_date |
| `last_occurrence_date` | esriFieldTypeDate | last_occurrence_date |
| `reported_date` | esriFieldTypeDate | reported_date |
| `incident_address` | esriFieldTypeString | incident_address |
| `geo_x` | esriFieldTypeInteger | geo_x |
| `geo_y` | esriFieldTypeInteger | geo_y |
| `geo_lon` | esriFieldTypeDouble | geo_lon |
| `geo_lat` | esriFieldTypeDouble | geo_lat |
| `district_id` | esriFieldTypeString | district_id |
| `precinct_id` | esriFieldTypeString | precinct_id |
| `neighborhood_id` | esriFieldTypeString | neighborhood_id |
| `bicycle_ind` | esriFieldTypeInteger | bicycle_ind |
| `pedestrian_ind` | esriFieldTypeInteger | pedestrian_ind |
| `HARMFUL_EVENT_SEQ_1` | esriFieldTypeString | HARMFUL_EVENT_SEQ_1 |
| `HARMFUL_EVENT_SEQ_2` | esriFieldTypeString | HARMFUL_EVENT_SEQ_2 |
| `HARMFUL_EVENT_SEQ_3` | esriFieldTypeString | HARMFUL_EVENT_SEQ_3 |
| `road_location` | esriFieldTypeString | road_location |
| `ROAD_DESCRIPTION` | esriFieldTypeString | ROAD_DESCRIPTION |
| `ROAD_CONTOUR` | esriFieldTypeString | ROAD_CONTOUR |
| `ROAD_CONDITION` | esriFieldTypeString | ROAD_CONDITION |
| `LIGHT_CONDITION` | esriFieldTypeString | LIGHT_CONDITION |
| `TU1_VEHICLE_TYPE` | esriFieldTypeString | TU1_VEHICLE_TYPE |
| `TU1_TRAVEL_DIRECTION` | esriFieldTypeString | TU1_TRAVEL_DIRECTION |
| `TU1_VEHICLE_MOVEMENT` | esriFieldTypeString | TU1_VEHICLE_MOVEMENT |
| `TU1_DRIVER_ACTION` | esriFieldTypeString | TU1_DRIVER_ACTION |
| `TU1_DRIVER_HUMANCONTRIBFACTOR` | esriFieldTypeString | TU1_DRIVER_HUMANCONTRIBFACTOR |
| `TU1_PEDESTRIAN_ACTION` | esriFieldTypeString | TU1_PEDESTRIAN_ACTION |
| `TU2_VEHICLE_TYPE` | esriFieldTypeString | TU2_VEHICLE_TYPE |
| `TU2_TRAVEL_DIRECTION` | esriFieldTypeString | TU2_TRAVEL_DIRECTION |
| `TU2_VEHICLE_MOVEMENT` | esriFieldTypeString | TU2_VEHICLE_MOVEMENT |
| `TU2_DRIVER_ACTION` | esriFieldTypeString | TU2_DRIVER_ACTION |
| `TU2_DRIVER_HUMANCONTRIBFACTOR` | esriFieldTypeString | TU2_DRIVER_HUMANCONTRIBFACTOR |
| `TU2_PEDESTRIAN_ACTION` | esriFieldTypeString | TU2_PEDESTRIAN_ACTION |
| `SERIOUSLY_INJURED` | esriFieldTypeInteger | SERIOUSLY_INJURED |
| `FATALITIES` | esriFieldTypeInteger | FATALITIES |
| `FATALITY_MODE_1` | esriFieldTypeString | FATALITY_MODE_1 |
| `FATALITY_MODE_2` | esriFieldTypeString | FATALITY_MODE_2 |
| `SERIOUSLY_INJURED_MODE_1` | esriFieldTypeString | SERIOUSLY_INJURED_MODE_1 |
| `SERIOUSLY_INJURED_MODE_2` | esriFieldTypeString | SERIOUSLY_INJURED_MODE_2 |
| `POINT_X` | esriFieldTypeDouble | POINT_X |
| `POINT_Y` | esriFieldTypeDouble | POINT_Y |

### 311_rolling
- **URL:** `https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_service_requests_311/FeatureServer/66`
- **Records:** 435,129
- **Date field:** `Case_Created_Date`
- **Range:** 2025-03-12 → 2026-03-12

**Fields (25):**

| Field | Type | Alias |
|-------|------|-------|
| `OBJECTID` | esriFieldTypeOID | OBJECTID |
| `Case_Summary` | esriFieldTypeString | Case Summary |
| `Case_Status` | esriFieldTypeString | Case Status |
| `Case_Source` | esriFieldTypeString | Case Source |
| `Case_Created_Date` | esriFieldTypeDate | Case Created Date |
| `Case_Created_dttm` | esriFieldTypeString | Case Created dttm |
| `Case_Closed_Date` | esriFieldTypeDate | Case Closed Date |
| `Case_Closed_dttm` | esriFieldTypeString | Case Closed dttm |
| `First_Call_Resolution` | esriFieldTypeString | First Call Resolution |
| `Customer_Zip_Code` | esriFieldTypeString | Customer Zip Code |
| `Incident_Address_1` | esriFieldTypeString | Incident Address 1 |
| `Incident_Address_2` | esriFieldTypeString | Incident Address 2 |
| `Incident_Intersection_1` | esriFieldTypeString | Incident Intersection 1 |
| `Incident_Intersection_2` | esriFieldTypeString | Incident Intersection 2 |
| `Incident_Zip_Code` | esriFieldTypeString | Incident Zip Code |
| `Longitude` | esriFieldTypeDouble | Longitude |
| `Latitude` | esriFieldTypeDouble | Latitude |
| `Agency` | esriFieldTypeString | Agency |
| `Division` | esriFieldTypeString | Division |
| `Major_Area` | esriFieldTypeString | Major Area |
| `Type` | esriFieldTypeString | Type |
| `Topic` | esriFieldTypeString | Topic |
| `Council_District` | esriFieldTypeInteger | Council District |
| `Police_District` | esriFieldTypeInteger | Police District |
| `Neighborhood` | esriFieldTypeString | Neighborhood |

### 311_2023
- **URL:** `https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/311_Service_Requests_2023/FeatureServer/0`
- **Records:** 474,695
- **Date field:** `Case_Created_dttm`
- **Range:** 2023-01-01 → 2023-12-31

**Fields (25):**

| Field | Type | Alias |
|-------|------|-------|
| `Case_Summary` | esriFieldTypeString | Case Summary |
| `Case_Status` | esriFieldTypeString | Case Status |
| `Case_Source` | esriFieldTypeString | Case Source |
| `Case_Created_Date` | esriFieldTypeDate | Case Created Date |
| `Case_Created_dttm` | esriFieldTypeDate | Case Created dttm |
| `Case_Closed_Date` | esriFieldTypeString | Case Closed Date |
| `Case_Closed_dttm` | esriFieldTypeString | Case Closed dttm |
| `First_Call_Resolution` | esriFieldTypeString | First Call Resolution |
| `Customer_Zip_Code` | esriFieldTypeString | Customer Zip Code |
| `Incident_Address_1` | esriFieldTypeString | Incident Address 1 |
| `Incident_Address_2` | esriFieldTypeString | Incident Address 2 |
| `Incident_Intersection_1` | esriFieldTypeString | Incident Intersection 1 |
| `Incident_Intersection_2` | esriFieldTypeString | Incident Intersection 2 |
| `Incident_Zip_Code` | esriFieldTypeString | Incident Zip Code |
| `Longitude` | esriFieldTypeDouble | Longitude |
| `Latitude` | esriFieldTypeDouble | Latitude |
| `Agency` | esriFieldTypeString | Agency |
| `Division` | esriFieldTypeString | Division |
| `Major_Area` | esriFieldTypeString | Major Area |
| `Type` | esriFieldTypeString | Type |
| `Topic` | esriFieldTypeString | Topic |
| `Council_District` | esriFieldTypeInteger | Council District |
| `Police_District` | esriFieldTypeInteger | Police District |
| `Neighborhood` | esriFieldTypeString | Neighborhood |
| `ObjectId` | esriFieldTypeOID | ObjectId |

### neighborhoods
- **URL:** `https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/ODC_ADMN_NEIGHBORHOOD_A/FeatureServer/13`
- **Records:** 78
- **Notes:** No date fields found

**Fields (8):**

| Field | Type | Alias |
|-------|------|-------|
| `OBJECTID` | esriFieldTypeOID | OBJECTID |
| `NBHD_ID` | esriFieldTypeSmallInteger | NBHD_ID |
| `NBHD_NAME` | esriFieldTypeString | NBHD_NAME |
| `TYPOLOGY` | esriFieldTypeString | TYPOLOGY |
| `NOTES` | esriFieldTypeString | NOTES |
| `GLOBALID` | esriFieldTypeGlobalID | GLOBALID |
| `Shape__Area` | esriFieldTypeDouble | Shape__Area |
| `Shape__Length` | esriFieldTypeDouble | Shape__Length |

## Neighborhoods GeoJSON

- **Feature count:** 78
- **Status:** OK

**All neighborhoods (78):**

- Athmar Park
- Auraria
- Baker
- Barnum
- Barnum West
- Bear Valley
- Belcaro
- Berkeley
- CBD
- Capitol Hill
- Central Park
- Chaffee Park
- Cheesman Park
- Cherry Creek
- City Park
- City Park West
- Civic Center
- Clayton
- Cole
- College View - South Platte
- Congress Park
- Cory - Merrill
- Country Club
- DIA
- East Colfax
- Elyria Swansea
- Five Points
- Fort Logan
- Gateway - Green Valley Ranch
- Globeville
- Goldsmith
- Hale
- Hampden
- Hampden South
- Harvey Park
- Harvey Park South
- Highland
- Hilltop
- Indian Creek
- Jefferson Park
- Kennedy
- Lincoln Park
- Lowry Field
- Mar Lee
- Marston
- Montbello
- Montclair
- North Capitol Hill
- North Park Hill
- Northeast Park Hill
- Overland
- Platt Park
- Regis
- Rosedale
- Ruby Hill
- Skyland
- Sloan Lake
- South Park Hill
- Southmoor Park
- Speer
- Sun Valley
- Sunnyside
- Union Station
- University
- University Hills
- University Park
- Valverde
- Villa Park
- Virginia Village
- Washington Park
- Washington Park West
- Washington Virginia Vale
- Wellshire
- West Colfax
- West Highland
- Westwood
- Whittier
- Windsor

## 311 Year-Partitioning Notes

- The rolling dataset (`ODC_service_requests_311`) covers ~12 months.
- Historical years are in separate layers (e.g., `311_Service_Requests_2023`).
- To get full history, union the rolling dataset with yearly archives.
- Field names are consistent across years.

## API Quirks and Limitations

- ArcGIS REST API returns max 2000 records per request (use `resultOffset` for pagination).
- Date fields are Unix timestamps in milliseconds.
- Some records may lack lat/lon coordinates.
- Data updates Monday–Friday; weekend data appears on Monday.
- GeoJSON format available via `f=geojson` parameter.