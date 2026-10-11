"""Pydantic models for the Saans API."""

from datetime import datetime
from enum import Enum
from typing import Optional, Union

from pydantic import BaseModel, Field, ConfigDict, AliasChoices


class Role(str, Enum):
    FARMER = "farmer"
    CITIZEN = "citizen"


class CropStage(str, Enum):
    HARVESTED = "harvested"
    PARTIALLY_CLEARED = "partially_cleared"
    STANDING = "standing"


class ReportCategory(str, Enum):
    CROP_BURNING = "crop_burning"
    GARBAGE_BURNING = "garbage_burning"
    CRACKER_BURNING = "cracker_burning"
    CONSTRUCTION_DUST = "construction_dust"


class ReportStatus(str, Enum):
    RECEIVED = "received"
    ROUTED = "routed"
    RESOLVED = "resolved"


class FacilityType(str, Enum):
    BIOMASS_POWER_PLANT = "biomass_power_plant"
    CBG_PLANT = "cbg_plant"
    PELLET_MAKER = "pellet_maker"
    BRICK_KILN = "brick_kiln"
    THERMAL_COFIRING = "thermal_cofiring"
    DEPOT = "depot"
    AGGREGATOR = "aggregator"


class AQICategory(str, Enum):
    GOOD = "Good"
    SATISFACTORY = "Satisfactory"
    MODERATE = "Moderate"
    POOR = "Poor"
    VERY_POOR = "Very Poor"
    SEVERE = "Severe"


# --- User models ---

class User(BaseModel):
    user_id: str
    role: Role
    name: str = ""
    phone: Optional[str] = None
    email: Optional[str] = None
    language: str = "en"
    created_at: Union[datetime, str] = Field(default_factory=datetime.utcnow)


class FarmerProfileInput(BaseModel):
    """Input validation for POST /v1/auth/profile when caller role is farmer."""
    model_config = ConfigDict(extra="forbid")

    village_id: str = Field(validation_alias=AliasChoices("village_id", "village"))
    village_name: Optional[str] = None
    district: str
    land_size_acres: float = Field(validation_alias=AliasChoices("land_size_acres", "land_size"))
    main_crop: str = Field(validation_alias=AliasChoices("main_crop", "crop"))
    crop_stage: CropStage
    has_own_machine: bool = False
    language: str = "pa"
    name: Optional[str] = None
    phone: Optional[str] = None


class CitizenProfileInput(BaseModel):
    """Input validation for POST /v1/auth/profile when caller role is citizen."""
    model_config = ConfigDict(extra="forbid")

    area_id: str = Field(validation_alias=AliasChoices("area_id", "area", "ward", "area_ward"))
    area_name: Optional[str] = None
    language: str = "en"
    alert_opt_in: Optional[bool] = None
    alert_threshold: Optional[int] = None
    household_note: Optional[str] = None
    has_kids: bool = False
    has_elderly: bool = False
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


FarmerProfileCreate = FarmerProfileInput
CitizenProfileCreate = CitizenProfileInput


class FarmerProfile(BaseModel):
    user_id: str
    role: Role = Role.FARMER
    name: str = ""
    phone: Optional[str] = None
    language: str = "pa"
    village_id: str
    village_name: Optional[str] = None
    district: str
    land_size_acres: float
    main_crop: str
    crop_stage: CropStage
    has_own_machine: bool = False
    created_at: Union[datetime, str] = Field(default_factory=datetime.utcnow)
    is_sample: bool = False


class CitizenProfile(BaseModel):
    user_id: str
    role: Role = Role.CITIZEN
    name: str = ""
    email: Optional[str] = None
    phone: Optional[str] = None
    language: str = "en"
    area_id: str
    area_name: Optional[str] = None
    alert_opt_in: Optional[bool] = None
    alert_threshold: Optional[int] = None
    household_note: Optional[str] = None
    has_kids: bool = False
    has_elderly: bool = False
    created_at: Union[datetime, str] = Field(default_factory=datetime.utcnow)
    is_sample: bool = False


# --- Report models ---

class Location(BaseModel):
    lat: float
    lng: float


class Report(BaseModel):
    report_id: str
    user_id: Optional[str] = None
    category: ReportCategory
    confidence: Optional[float] = None
    location: Location
    photo_key: Optional[str] = None
    status: ReportStatus = ReportStatus.RECEIVED
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_sample: bool = True


# --- Machine slot models ---

class MachineSlot(BaseModel):
    slot_id: str
    village_id: str
    date: str
    machine_type: str
    owner_label: str
    slots_free: int
    is_sample: bool = True


# --- Straw outlet models ---

class StrawOutlet(BaseModel):
    outlet_id: str
    district_id: str
    facility_type: FacilityType
    name: str
    contact_hint: str = "Contact your nearest depot or aggregator"
    is_sample: bool = True


# --- Plan result models ---

class ScoreBreakdown(BaseModel):
    sowing_window: int
    rain_and_soil: int
    wind: int
    fire_activity: int
    machine_availability: int


class ToolTraceEntry(BaseModel):
    tool: str
    status: str
    latency_ms: int


class DayScore(BaseModel):
    date: str
    score: int


class MachineOption(BaseModel):
    slot_id: str
    machine_type: str
    owner_label: str
    date: str
    is_sample: bool = True


class StrawOutletOption(BaseModel):
    outlet_id: str
    facility_type: FacilityType
    name: str
    contact_hint: str
    is_sample: bool = True


class PlanResult(BaseModel):
    best_day: str
    score: int
    score_breakdown: ScoreBreakdown
    machine_option: Optional[MachineOption] = None
    straw_outlet_option: Optional[StrawOutletOption] = None
    reason_text: str
    tool_trace: list[ToolTraceEntry]
    seven_day_scores: list[DayScore]
    is_sample: bool = True
    window_start: Optional[str] = None
    window_end: Optional[str] = None
    generated_at: Optional[str] = None
    sowing_window_status: Optional[str] = "inside"
    no_ideal_day: bool = False
    message_key: Optional[str] = None


# --- Today response models ---

class WindInfo(BaseModel):
    speed_kmh: float
    direction: str
    description: str


class TrendPoint(BaseModel):
    hour: str
    aqi: int


class NearbyReport(BaseModel):
    report_id: str
    category: ReportCategory
    status: ReportStatus
    distance_km: float
    created_at: str


class Freshness(BaseModel):
    data_updated_at: str
    label: str


class TodayResponse(BaseModel):
    area_id: str
    area_name: str
    aqi: int
    aqi_category: AQICategory
    aqi_color: str
    advice: str
    trend_24h: list[TrendPoint]
    wind: WindInfo
    smoke_drift_note: str
    nearby_reports: list[NearbyReport]
    freshness: Freshness
    is_sample: bool = True


# --- Map layer models ---

class MapLayers(BaseModel):
    """Container for all map GeoJSON layers. Each layer is a raw dict (GeoJSON FeatureCollection)."""
    aqi_heatmap: dict
    fire_hotspots: dict
    wind_arrows: dict
    report_markers: dict
    machine_points: dict
    freshness: dict
