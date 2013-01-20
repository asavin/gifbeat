class AddSourceIdToSounds < ActiveRecord::Migration
  def change
    add_column :tracks, :source_id, :string
  end
end
