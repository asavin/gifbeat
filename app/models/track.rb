class Track < ActiveRecord::Base
  attr_accessible :mood_id, :name, :sound_id, :source_id
end
