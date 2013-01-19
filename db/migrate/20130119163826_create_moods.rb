class CreateMoods < ActiveRecord::Migration
  def change
    create_table :moods do |t|
      t.string :name
      t.string :color
      t.integer :energy

      t.timestamps
    end
  end
end
