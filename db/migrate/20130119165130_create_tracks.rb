class CreateTracks < ActiveRecord::Migration
  def change
    create_table :tracks do |t|
      t.string :sound_id
      t.string :name
      t.integer :mood_id

      t.timestamps
    end
  end
end
